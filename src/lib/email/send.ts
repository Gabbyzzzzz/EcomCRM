import { Resend } from 'resend'
import { render } from '@react-email/render'
import { eq } from 'drizzle-orm'
import { env } from '@/lib/env'
import { db } from '@/lib/db'
import { messageLogs } from '@/lib/db/schema'
import {
  checkSuppression,
  getCustomerByInternalId,
} from '@/lib/db/queries'
import { buildUnsubscribeUrl } from '@/lib/email/unsubscribe'
import type { ReactElement } from 'react'

const resend = new Resend(env.RESEND_API_KEY)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendMarketingEmailParams {
  /** Internal UUID of the shop (derived from SHOPIFY_STORE_URL hostname) */
  shopId: string
  /** UUID from the customers table (NOT Shopify ID) */
  customerInternalId: string
  /** Email subject line */
  subject: string
  /**
   * Factory function that receives the generated unsubscribeUrl and returns a
   * ReactElement. This pattern ensures callers cannot forget to pass the URL
   * to the template body, and guarantees the URL in List-Unsubscribe header is
   * identical to the URL in the email body.
   *
   * @example
   * templateFactory: (url) => <WelcomeEmail storeName="MyStore" unsubscribeUrl={url} />
   */
  templateFactory: (unsubscribeUrl: string) => ReactElement
  /**
   * Caller-provided idempotency key to prevent duplicate sends.
   * Recommended format: `${automationId}-${customerId}-${triggeredAt}`
   */
  idempotencyKey: string
  /** Optional FK to automations table — stored in MessageLog */
  automationId?: string
  /**
   * Phase 14: Optional pre-rendered HTML for Tier 1 (customTemplateHtml) and
   * Tier 2 (linked email template) sends. When provided, skips the templateFactory
   * render step and uses this HTML directly. Tracking pixel + link rewriting
   * still apply. Variable substitution must be done by the caller before passing.
   */
  rawHtml?: string
}

export interface SendResult {
  sent: boolean
  reason?: 'suppressed_opted_out' | 'suppressed_bounced' | 'suppressed_no_email' | 'sent' | 'error'
  resendId?: string
}

// ─── Suppression log helper ───────────────────────────────────────────────────

async function logSuppressed(
  shopId: string,
  customerInternalId: string,
  subject: string,
  automationId?: string
) {
  try {
    await db.insert(messageLogs).values({
      shopId,
      customerId: customerInternalId,
      automationId: automationId ?? null,
      channel: 'email',
      subject,
      status: 'suppressed',
    })
  } catch (err) {
    // Non-fatal — log but do not throw
    console.error('[sendMarketingEmail] Failed to insert suppressed MessageLog:', err)
  }
}

// ─── Tracking helpers ─────────────────────────────────────────────────────────

/**
 * Inject a 1x1 transparent tracking pixel before the closing </body> tag.
 *
 * NOTE: Apple Mail Privacy Protection (MPP) pre-fetches images including tracking
 * pixels, inflating open rates. Click rate is the more reliable engagement metric.
 */
export function injectTrackingPixel(html: string, messageLogId: string): string {
  const pixelUrl = `${env.APP_URL}/api/track/open?id=${messageLogId}`
  const pixelTag = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`
  // Insert before closing </body> tag if present, otherwise append
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelTag}</body>`)
  }
  return html + pixelTag
}

/**
 * Rewrite all http(s) href links in anchor tags to route through the click
 * tracking redirect endpoint. Unsubscribe links, mailto: links, anchor (#)
 * links, and non-http(s) URLs are left untouched.
 */
export function rewriteLinks(html: string, messageLogId: string): string {
  const baseUrl = env.APP_URL
  // Match href="..." in anchor tags, but skip unsubscribe links and mailto: links
  return html.replace(
    /(<a\s[^>]*href=")([^"]+)(")/gi,
    (match, prefix, url, suffix) => {
      // Skip unsubscribe links — must remain direct for compliance
      if (url.includes('/unsubscribe')) return match
      // Skip mailto: links
      if (url.startsWith('mailto:')) return match
      // Skip anchor links
      if (url.startsWith('#')) return match
      // Skip non-http(s) links
      if (!url.startsWith('http://') && !url.startsWith('https://')) return match
      // Rewrite to click tracking redirect
      const trackUrl = `${baseUrl}/api/track/click?id=${messageLogId}&url=${encodeURIComponent(url)}`
      return `${prefix}${trackUrl}${suffix}`
    }
  )
}

// ─── Main send function ───────────────────────────────────────────────────────

/**
 * Send a marketing email via Resend with full compliance handling.
 *
 * Pre-send checks (in order):
 * 1. Customer must have an email address
 * 2. Customer must not have marketing_opted_out = true
 * 3. Email address must not be in the suppressions table (hard bounces, unsubscribes)
 *
 * Compliance:
 * - List-Unsubscribe header (RFC 2369) with one-click URL
 * - List-Unsubscribe-Post header (RFC 8058) for Gmail/Yahoo one-click unsubscribe
 * - Idempotency key forwarded to Resend to prevent duplicate sends
 *
 * All blocked sends and errors are logged to MessageLog — never thrown.
 */
export async function sendMarketingEmail(
  params: SendMarketingEmailParams
): Promise<SendResult> {
  const { shopId, customerInternalId, subject, templateFactory, idempotencyKey, automationId, rawHtml } =
    params

  // ── Step 1: Look up customer ──────────────────────────────────────────────
  const customer = await getCustomerByInternalId(shopId, customerInternalId)

  // ── Step 2: Check for email address ──────────────────────────────────────
  if (!customer?.email) {
    await logSuppressed(shopId, customerInternalId, subject, automationId)
    return { sent: false, reason: 'suppressed_no_email' }
  }

  const email = customer.email

  // ── Step 3: Check marketing opt-out flag ──────────────────────────────────
  if (customer.marketingOptedOut === true) {
    await logSuppressed(shopId, customerInternalId, subject, automationId)
    return { sent: false, reason: 'suppressed_opted_out' }
  }

  // ── Step 4: Check suppression table (hard bounces / prior unsubscribes) ──
  const isSuppressed = await checkSuppression(shopId, email)
  if (isSuppressed) {
    await logSuppressed(shopId, customerInternalId, subject, automationId)
    return { sent: false, reason: 'suppressed_bounced' }
  }

  // ── Step 5: Build unsubscribe URL ─────────────────────────────────────────
  // This URL is used in BOTH the List-Unsubscribe header AND passed to the
  // template factory so the email body contains the identical link.
  const unsubscribeUrl = buildUnsubscribeUrl(customerInternalId, shopId)

  // ── Step 6: Render template ───────────────────────────────────────────────
  // Phase 14: If rawHtml is provided (Tier 1/2), skip React Email render entirely.
  // Tracking pixel injection + link rewriting still apply to rawHtml.
  let html: string
  if (rawHtml !== undefined) {
    html = rawHtml
  } else {
    const element = templateFactory(unsubscribeUrl)
    html = await render(element)
  }

  // ── Step 7: Pre-insert MessageLog to get messageLogId for tracking URLs ──
  let messageLogId: string
  try {
    const [logRow] = await db.insert(messageLogs).values({
      shopId,
      customerId: customerInternalId,
      automationId: automationId ?? null,
      channel: 'email',
      subject,
      status: 'sent',
      sentAt: new Date(),
    }).returning({ id: messageLogs.id })
    messageLogId = logRow.id
  } catch (err) {
    console.error('[sendMarketingEmail] Failed to pre-insert MessageLog:', err)
    return { sent: false, reason: 'error' }
  }

  // ── Step 8: Inject tracking pixel + rewrite links ────────────────────────
  const trackedHtml = rewriteLinks(injectTrackingPixel(html, messageLogId), messageLogId)

  // ── Step 9: Send via Resend ───────────────────────────────────────────────
  try {
    const fromAddress = `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`

    const { data, error } = await resend.emails.send(
      {
        from: fromAddress,
        to: email,
        subject,
        html: trackedHtml,
        replyTo: env.RESEND_REPLY_TO ?? undefined,
        headers: {
          // RFC 2369 + RFC 8058 — required for Gmail/Yahoo one-click unsubscribe
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        tags: [{ name: 'shop_id', value: shopId }],
      },
      { idempotencyKey }
    )

    if (error || !data) {
      console.error('[sendMarketingEmail] Resend returned error:', error)
      // Update pre-inserted log to failed
      try {
        await db.update(messageLogs).set({ status: 'failed' }).where(eq(messageLogs.id, messageLogId))
      } catch { /* ignore secondary failure */ }
      return { sent: false, reason: 'error' }
    }

    return { sent: true, reason: 'sent', resendId: data.id }
  } catch (err) {
    // Non-fatal: email failures should never crash the automation engine
    console.error('[sendMarketingEmail] Unexpected error:', err)
    try {
      await db.update(messageLogs).set({ status: 'failed' }).where(eq(messageLogs.id, messageLogId))
    } catch {
      // ignore secondary logging failure
    }
    return { sent: false, reason: 'error' }
  }
}
