import { NextResponse } from 'next/server'
import { shopifyGraphQL } from '@/lib/shopify/client'
import { env } from '@/lib/env'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookCreateResult {
  webhookSubscriptionCreate: {
    webhookSubscription: {
      id: string
      endpoint?: { callbackUrl?: string }
    } | null
    userErrors: Array<{ field: string[]; message: string }>
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEBHOOK_TOPICS = [
  'ORDERS_CREATE',
  'CUSTOMERS_CREATE',
  'CUSTOMERS_UPDATE',
] as const

const REGISTER_MUTATION = `
  mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $callbackUrl: URL!) {
    webhookSubscriptionCreate(
      topic: $topic
      webhookSubscription: { callbackUrl: $callbackUrl, format: JSON }
    ) {
      webhookSubscription {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`

// ─── POST /api/webhooks/register ──────────────────────────────────────────────

export async function POST() {
  const callbackUrl = `${env.APP_URL}/api/webhooks/shopify`
  const results: Array<{
    topic: string
    status: 'registered' | 'already_exists' | 'error'
    message?: string
  }> = []

  for (const topic of WEBHOOK_TOPICS) {
    try {
      const res = await shopifyGraphQL<WebhookCreateResult>(REGISTER_MUTATION, {
        topic,
        callbackUrl,
      })

      const { webhookSubscription, userErrors } = res.data.webhookSubscriptionCreate

      if (userErrors.length > 0) {
        const msg = userErrors.map((e) => e.message).join(', ')
        const alreadyExists = userErrors.some((e) =>
          e.message.toLowerCase().includes('already')
        )
        results.push({
          topic,
          status: alreadyExists ? 'already_exists' : 'error',
          message: msg,
        })
      } else if (webhookSubscription) {
        results.push({ topic, status: 'registered' })
      } else {
        results.push({ topic, status: 'error', message: 'No subscription returned' })
      }
    } catch (err) {
      results.push({
        topic,
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  const hasErrors = results.some((r) => r.status === 'error')
  return NextResponse.json({ results }, { status: hasErrors ? 207 : 200 })
}
