import { Resend } from 'resend'
import { render } from '@react-email/render'
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
  const { shopId, customerInternalId, subject, templateFactory, idempotencyKey, automationId } =
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
  const element = templateFactory(unsubscribeUrl)
  const html = await render(element)

  // ── Step 7: Send via Resend ───────────────────────────────────────────────
  try {
    const fromAddress = `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`

    const { data, error } = await resend.emails.send(
      {
        from: fromAddress,
        to: email,
        subject,
        html,
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
      await db.insert(messageLogs).values({
        shopId,
        customerId: customerInternalId,
        automationId: automationId ?? null,
        channel: 'email',
        subject,
        status: 'failed',
        sentAt: new Date(),
      })
      return { sent: false, reason: 'error' }
    }

    // ── Step 8: Log successful send ───────────────────────────────────────
    await db.insert(messageLogs).values({
      shopId,
      customerId: customerInternalId,
      automationId: automationId ?? null,
      channel: 'email',
      subject,
      status: 'sent',
      sentAt: new Date(),
    })

    return { sent: true, reason: 'sent', resendId: data.id }
  } catch (err) {
    // Non-fatal: email failures should never crash the automation engine
    console.error('[sendMarketingEmail] Unexpected error:', err)
    try {
      await db.insert(messageLogs).values({
        shopId,
        customerId: customerInternalId,
        automationId: automationId ?? null,
        channel: 'email',
        subject,
        status: 'failed',
        sentAt: new Date(),
      })
    } catch {
      // ignore secondary logging failure
    }
    return { sent: false, reason: 'error' }
  }
}
