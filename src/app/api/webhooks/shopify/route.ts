import { inngest } from '@/inngest/client'
import {
  verifyShopifyWebhook,
  parseWebhookTopic,
  extractWebhookId,
} from '@/lib/shopify/webhooks'
import {
  checkWebhookIdempotency,
  recordWebhookDelivery,
} from '@/lib/db/queries'
import { env } from '@/lib/env'

// ─── Shop ID derivation ───────────────────────────────────────────────────────

/**
 * Extract the shop name from the SHOPIFY_STORE_URL env var.
 * e.g. "https://my-store.myshopify.com" → "my-store.myshopify.com"
 * Used as the shopId for single-tenant Custom App deployments.
 */
function getShopId(): string {
  return new URL(env.SHOPIFY_STORE_URL).hostname
}

// ─── POST handler ─────────────────────────────────────────────────────────────

/**
 * Shopify webhook ingestion endpoint.
 *
 * SHOP-04: Raw body is read BEFORE any JSON parsing.
 * SHOP-05: Idempotency enforced via webhookDeliveries table (X-Shopify-Webhook-Id).
 * Processing is dispatched async to Inngest — 200 returned immediately.
 */
export async function POST(request: Request): Promise<Response> {
  // ── Step 1: Read raw body FIRST — before any JSON.parse (SHOP-04) ─────────
  const rawBody = await request.text()

  // ── Step 2: Verify HMAC ───────────────────────────────────────────────────
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256') ?? ''

  if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
    console.warn('[webhook] HMAC verification failed — rejecting request')
    return new Response('Unauthorized', { status: 401 })
  }

  // ── Step 3: Extract metadata ──────────────────────────────────────────────
  const webhookId = extractWebhookId(request.headers)
  const topic = parseWebhookTopic(request.headers)
  const shopId = getShopId()

  // ── Step 4: Idempotency check (SHOP-05) ───────────────────────────────────
  const alreadyProcessed = await checkWebhookIdempotency(shopId, webhookId)
  if (alreadyProcessed) {
    console.log(
      `[webhook] Duplicate delivery ${webhookId} for topic ${topic} — skipping`
    )
    return new Response('OK', { status: 200 })
  }

  // ── Step 5: Record the delivery BEFORE dispatching ────────────────────────
  // This prevents a race condition where the same webhook fires twice simultaneously.
  await recordWebhookDelivery(shopId, webhookId, topic, 'processing')

  // ── Step 6: Parse payload ─────────────────────────────────────────────────
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.error('[webhook] Failed to parse JSON payload')
    return new Response('Bad Request', { status: 400 })
  }

  // ── Step 7: Dispatch to Inngest for async processing ──────────────────────
  await inngest.send({
    name: 'shopify/webhook.received',
    data: {
      shopId,
      topic,
      payload,
      webhookId,
    },
  })

  // Return 200 immediately — Inngest handles actual processing asynchronously
  return new Response('OK', { status: 200 })
}
