import { env } from '@/lib/env'
import type { GraphQLResponse } from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

const SHOPIFY_API_VERSION = '2024-10'
const MAX_RETRIES = 3
/** Refresh the token if it expires within this many ms (5 minutes) */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

// ─── Token cache ─────────────────────────────────────────────────────────────

interface CachedToken {
  accessToken: string
  /** Absolute timestamp (ms) when the token expires */
  expiresAt: number
}

let tokenCache: CachedToken | null = null

/**
 * Fetches a new access token from Shopify using the client credentials grant.
 * Tokens expire in 24 hours (expires_in: 86399).
 */
async function fetchAccessToken(): Promise<CachedToken> {
  const tokenEndpoint = `${env.SHOPIFY_STORE_URL}/admin/oauth/access_token`

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Shopify token request failed: ${response.status} ${response.statusText} — ${body}`
    )
  }

  const data = (await response.json()) as {
    access_token: string
    expires_in: number
    scope: string
  }

  const cached: CachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  console.info(
    `[shopify] Access token obtained, expires in ${Math.round(data.expires_in / 3600)}h`
  )

  return cached
}

/**
 * Returns a valid access token, auto-refreshing if it expires within 5 minutes.
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now()

  if (
    tokenCache === null ||
    tokenCache.expiresAt - now < TOKEN_REFRESH_BUFFER_MS
  ) {
    console.info('[shopify] Refreshing access token...')
    tokenCache = await fetchAccessToken()
  }

  return tokenCache.accessToken
}

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
 * Token management:
 * - Uses client credentials grant (Partners Dashboard OAuth app).
 * - Tokens are cached in memory and auto-refreshed 5 minutes before expiry.
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

  let lastError: Error | undefined

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Exponential backoff for throttle retries (skip on first attempt)
    if (attempt > 0) {
      const backoffMs = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s
      console.warn(
        `[shopify] Throttled — retry ${attempt}/${MAX_RETRIES - 1}, waiting ${backoffMs}ms`
      )
      await sleep(backoffMs)
    }

    // Resolve a valid token before each attempt (auto-refreshes if near expiry)
    const accessToken = await getAccessToken()

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
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
      // 401 Unauthorized — token may have just expired; clear cache and retry once
      if (response.status === 401 && attempt === 0) {
        console.warn('[shopify] 401 on GraphQL request — clearing token cache and retrying')
        tokenCache = null
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
