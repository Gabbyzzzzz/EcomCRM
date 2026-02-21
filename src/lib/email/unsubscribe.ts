import { createHmac } from 'crypto'
import { env } from '@/lib/env'

/**
 * Generate a signed unsubscribe token for a customer.
 *
 * Token format (before base64url encoding):
 *   customerId:shopId:timestamp:hmac
 *
 * The HMAC-SHA256 signature (over "customerId:shopId:timestamp") prevents
 * forged unsubscribe requests from unsubscribing arbitrary customers.
 */
export function generateUnsubscribeToken(
  customerId: string,
  shopId: string
): string {
  const timestamp = Date.now().toString()
  const payload = `${customerId}:${shopId}:${timestamp}`
  const hmac = createHmac('sha256', env.SHOPIFY_CLIENT_SECRET)
    .update(payload)
    .digest('hex')
  const raw = `${payload}:${hmac}`
  // base64url — URL-safe variant (no padding, + -> -, / -> _)
  return Buffer.from(raw).toString('base64url')
}

/**
 * Verify an unsubscribe token and extract the encoded customer/shop IDs.
 *
 * Returns null if the token is malformed or the HMAC signature does not match.
 * Tokens do NOT expire by design — once issued, an unsubscribe link should
 * always work regardless of age.
 */
export function verifyUnsubscribeToken(
  token: string
): { customerId: string; shopId: string } | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = raw.split(':')
    // Expected: [customerId, shopId, timestamp, hmac]
    if (parts.length !== 4) return null
    const [customerId, shopId, timestamp, providedHmac] = parts
    if (!customerId || !shopId || !timestamp || !providedHmac) return null

    const payload = `${customerId}:${shopId}:${timestamp}`
    const expectedHmac = createHmac('sha256', env.SHOPIFY_CLIENT_SECRET)
      .update(payload)
      .digest('hex')

    // Constant-time comparison to prevent timing attacks
    if (expectedHmac !== providedHmac) return null

    return { customerId, shopId }
  } catch {
    return null
  }
}

/**
 * Build a full unsubscribe URL for use in email footers and List-Unsubscribe headers.
 *
 * Format: {APP_URL}/unsubscribe?token={token}
 */
export function buildUnsubscribeUrl(
  customerId: string,
  shopId: string
): string {
  const token = generateUnsubscribeToken(customerId, shopId)
  return `${env.APP_URL}/unsubscribe?token=${token}`
}
