import { env } from '@/lib/env'
import type { GraphQLResponse } from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

const SHOPIFY_API_VERSION = '2024-10'
const MAX_RETRIES = 3

// ─── Internal helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getShopifyEndpoint(): string {
  return `${env.SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`
}

// ─── Core GraphQL request function ───────────────────────────────────────────

/**
 * Makes an authenticated request to the Shopify Admin GraphQL API.
 *
 * Cost-based throttling (SHOP-01):
 * - After each response, checks currentlyAvailable vs requestedQueryCost.
 * - If budget is getting low (< requestedQueryCost * 2), proactively sleeps
 *   to allow the bucket to refill — preventing 429 errors before they occur.
 * - On explicit Throttled errors, retries up to MAX_RETRIES with exponential
 *   backoff (1s, 2s, 4s).
 */
export async function shopifyGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<GraphQLResponse<T>> {
  const endpoint = getShopifyEndpoint()
  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': env.SHOPIFY_ACCESS_TOKEN,
  }

  let lastError: Error | undefined

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Exponential backoff for retries (skip on first attempt)
    if (attempt > 0) {
      const backoffMs = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s
      console.warn(
        `[shopify] Throttled — retry ${attempt}/${MAX_RETRIES - 1}, waiting ${backoffMs}ms`
      )
      await sleep(backoffMs)
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      lastError = new Error(
        `Shopify HTTP error: ${response.status} ${response.statusText}`
      )
      // 429 rate limit — treat like a throttle and retry
      if (response.status === 429) {
        continue
      }
      throw lastError
    }

    const json = (await response.json()) as GraphQLResponse<T>

    // Check for throttle errors in the GraphQL errors array
    const isThrottled = json.errors?.some((e) =>
      e.message.toLowerCase().includes('throttled')
    )

    if (isThrottled) {
      lastError = new Error('Shopify GraphQL API throttled')
      continue // retry with backoff
    }

    // Non-throttle GraphQL errors — throw immediately
    if (json.errors && json.errors.length > 0) {
      throw new Error(
        `Shopify GraphQL errors: ${json.errors.map((e) => e.message).join(', ')}`
      )
    }

    // ── Cost-based proactive throttling (SHOP-01) ──────────────────────────
    // After a successful response, check remaining budget. If running low,
    // sleep proactively so we don't hit 429 on the next request.
    const cost = json.extensions?.cost
    if (cost) {
      const { requestedQueryCost, throttleStatus } = cost
      const { currentlyAvailable, restoreRate } = throttleStatus

      if (currentlyAvailable < requestedQueryCost * 2) {
        const deficit = requestedQueryCost * 2 - currentlyAvailable
        const sleepMs = Math.ceil((deficit / restoreRate) * 1000)
        console.warn(
          `[shopify] Budget low (${currentlyAvailable}/${throttleStatus.maximumAvailable}), sleeping ${sleepMs}ms to refill`
        )
        await sleep(sleepMs)
      }
    }

    return json
  }

  throw (
    lastError ??
    new Error(`Shopify GraphQL request failed after ${MAX_RETRIES} retries`)
  )
}

// ─── Convenience client object ────────────────────────────────────────────────

export const shopifyClient = {
  /**
   * Executes a GraphQL query and returns only the data payload.
   * Throws on any GraphQL error or throttle exhaustion.
   */
  async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const response = await shopifyGraphQL<T>(query, variables)
    return response.data
  },

  /**
   * Executes a GraphQL query and returns the full response including
   * extensions (cost info). Use this when you need throttle/cost metadata.
   */
  async rawQuery<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<GraphQLResponse<T>> {
    return shopifyGraphQL<T>(query, variables)
  },
}
