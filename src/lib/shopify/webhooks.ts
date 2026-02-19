import crypto from 'crypto'
import { env } from '@/lib/env'

// ─── HMAC verification ────────────────────────────────────────────────────────

/**
 * Verify a Shopify webhook request using HMAC-SHA256.
 *
 * SHOP-04: Verification MUST happen before any payload parsing.
 * The raw body (not parsed JSON) is used for HMAC computation.
 *
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 */
export function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string
): boolean {
  try {
    const secret = env.SHOPIFY_WEBHOOK_SECRET

    // Compute HMAC-SHA256 of the raw body using the webhook secret
    const computed = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64')

    // Timing-safe comparison prevents timing attacks
    // Both buffers must have the same byte length for timingSafeEqual
    const computedBuf = Buffer.from(computed, 'utf8')
    const headerBuf = Buffer.from(hmacHeader, 'utf8')

    if (computedBuf.length !== headerBuf.length) {
      return false
    }

    return crypto.timingSafeEqual(computedBuf, headerBuf)
  } catch {
    // Any error (malformed header, etc.) means verification failed
    return false
  }
}

// ─── Header extraction ────────────────────────────────────────────────────────

/**
 * Extract the webhook topic from Shopify request headers.
 * Returns the topic string (e.g., 'orders/create', 'customers/update').
 */
export function parseWebhookTopic(headers: Headers): string {
  return headers.get('x-shopify-topic') ?? ''
}

/**
 * Extract the unique webhook delivery ID from Shopify request headers.
 * Used for idempotency — same delivery id = same event, skip processing.
 */
export function extractWebhookId(headers: Headers): string {
  return headers.get('x-shopify-webhook-id') ?? ''
}
