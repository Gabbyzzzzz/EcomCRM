import { Resend } from 'resend'
import { render } from '@react-email/render'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { automations, messageLogs } from '@/lib/db/schema'
import { env } from '@/lib/env'
import { injectTrackingPixel, rewriteLinks } from '@/lib/email/send'
import WelcomeEmail from '@/emails/welcome'
import WinbackEmail from '@/emails/winback'
import VipEmail from '@/emails/vip'
import RepurchaseEmail from '@/emails/repurchase'
import AbandonedCartEmail from '@/emails/abandoned-cart'
import type { ReactElement } from 'react'

const resend = new Resend(env.RESEND_API_KEY)

// ─── Subject defaults ─────────────────────────────────────────────────────────

const SUBJECT_MAP: Record<string, string> = {
  'welcome':        'Welcome to our store!',
  'abandoned-cart': 'You left something behind...',
  'repurchase':     'Time to reorder?',
  'winback':        "We miss you — here's an offer",
  'vip':            'Welcome to the VIP club',
}

// ─── Request body schema ──────────────────────────────────────────────────────
// Three-layer priority: body params > DB actionConfig > hardcoded defaults
// Body params are the currently-edited (unsaved) form values.

const bodySchema = z.object({
  email: z.string().email(),
  // Optional overrides — the currently edited form values (may be unsaved)
  subject: z.string().optional(),
  headline: z.string().optional(),
  body: z.string().optional(),
  ctaText: z.string().optional(),
  discountCode: z.string().optional(),
})

// ─── ActionConfig shape from DB ───────────────────────────────────────────────

interface StoredActionConfig {
  subject?: string
  headline?: string
  body?: string
  ctaText?: string
  discountCode?: string
}

// ─── Template builder ─────────────────────────────────────────────────────────

function buildTestTemplate(
  templateId: string | null,
  storeName: string,
  unsubscribeUrl: string,
  overrides: {
    headline?: string
    body?: string
    ctaText?: string
    discountCode?: string
  }
): ReactElement {
  const { headline, body, ctaText, discountCode } = overrides

  switch (templateId) {
    case 'winback': {
      // discountCode maps to the winback incentive prop
      const incentive = discountCode
        ? `Use code ${discountCode}`
        : '10% off your next order'
      return WinbackEmail({
        storeName,
        customerName: 'Test Customer',
        daysSinceLastOrder: 90,
        incentive,
        shopUrl: env.SHOPIFY_STORE_URL,
        unsubscribeUrl,
        customHeadline: headline,
        customBody: body,
        customCtaText: ctaText,
      })
    }
    case 'vip':
      return VipEmail({
        storeName,
        customerName: 'Test Customer',
        totalSpent: '1,250.00',
        orderCount: 12,
        perks: ['Early access to new products', 'Free shipping on all orders', 'Exclusive VIP discounts'],
        shopUrl: env.SHOPIFY_STORE_URL,
        unsubscribeUrl,
        customHeadline: headline,
        customBody: body,
        customCtaText: ctaText,
      })
    case 'repurchase':
      return RepurchaseEmail({
        storeName,
        customerName: 'Test Customer',
        lastOrderDate: new Date(Date.now() - 30 * 86400000).toLocaleDateString(),
        unsubscribeUrl,
        shopUrl: env.SHOPIFY_STORE_URL,
        customHeadline: headline,
        customBody: body,
        customCtaText: ctaText,
      })
    case 'abandoned-cart':
      return AbandonedCartEmail({
        storeName,
        customerName: 'Test Customer',
        cartItems: [{ title: 'Sample Product', price: '$49.00' }],
        cartUrl: env.SHOPIFY_STORE_URL,
        unsubscribeUrl,
        customHeadline: headline,
        customBody: body,
        customCtaText: ctaText,
      })
    default:
      return WelcomeEmail({
        storeName,
        customerName: 'Test Customer',
        unsubscribeUrl,
        customHeadline: headline,
        customBody: body,
        customCtaText: ctaText,
      })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const shopId = new URL(env.SHOPIFY_STORE_URL).hostname

    const rawBody = await request.json() as unknown
    const parsed = bodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { email, subject: bodySubject, headline: bodyHeadline, body: bodyBody, ctaText: bodyCtaText, discountCode: bodyDiscountCode } = parsed.data

    const [automation] = await db
      .select()
      .from(automations)
      .where(and(eq(automations.id, id), eq(automations.shopId, shopId)))
      .limit(1)

    if (!automation) {
      return Response.json({ error: 'Automation not found' }, { status: 404 })
    }

    // Read saved DB actionConfig (layer 2 — fallback when body params not provided)
    const dbConfig = automation.actionConfig as StoredActionConfig | null

    // Three-layer priority: body params > DB actionConfig > hardcoded defaults
    const overrides = {
      headline: bodyHeadline ?? dbConfig?.headline,
      body: bodyBody ?? dbConfig?.body,
      ctaText: bodyCtaText ?? dbConfig?.ctaText,
      discountCode: bodyDiscountCode ?? dbConfig?.discountCode,
    }

    // Subject: body param > DB actionConfig > automation name > SUBJECT_MAP default
    const subject = `[TEST] ${bodySubject ?? dbConfig?.subject ?? (SUBJECT_MAP[automation.emailTemplateId ?? ''] ?? automation.name)}`

    const storeName = env.RESEND_FROM_NAME
    const unsubscribeUrl = `${env.APP_URL}/unsubscribe?test=true`

    const element = buildTestTemplate(automation.emailTemplateId, storeName, unsubscribeUrl, overrides)
    const html = await render(element)

    // Pre-insert MessageLog to get messageLogId for tracking URLs
    // customerId is null for test sends (no real customer)
    let messageLogId: string | null = null
    try {
      const [logRow] = await db.insert(messageLogs).values({
        shopId,
        customerId: null,
        automationId: id,
        channel: 'email',
        subject,
        status: 'sent',
        sentAt: new Date(),
      }).returning({ id: messageLogs.id })
      messageLogId = logRow.id
    } catch (err) {
      console.error('[send-test] Failed to pre-insert MessageLog:', err)
      // Continue — tracking is best-effort, do not block the test send
    }

    // Inject tracking pixel and rewrite links
    const trackedHtml = messageLogId
      ? rewriteLinks(injectTrackingPixel(html, messageLogId), messageLogId)
      : html

    const { data, error } = await resend.emails.send({
      from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
      to: email,
      subject,
      html: trackedHtml,
    })

    if (error || !data) {
      if (messageLogId) {
        try {
          await db.update(messageLogs).set({ status: 'failed' }).where(eq(messageLogs.id, messageLogId))
        } catch { /* ignore secondary failure */ }
      }
      return Response.json({ error: error?.message ?? 'Send failed' }, { status: 500 })
    }

    return Response.json({ sent: true, resendId: data.id })
  } catch (err) {
    console.error('[send-test] error:', err)
    return Response.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
