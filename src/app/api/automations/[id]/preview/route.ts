import { NextRequest } from 'next/server'
import * as React from 'react'
import { render } from '@react-email/render'
import { z } from 'zod'
import { env } from '@/lib/env'
import { db } from '@/lib/db'
import { automations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getEmailTemplate } from '@/lib/db/queries'
import { substituteVariables } from '@/lib/automation/actions'
import WelcomeEmail from '@/emails/welcome'
import WinbackEmail from '@/emails/winback'
import RepurchaseEmail from '@/emails/repurchase'
import AbandonedCartEmail from '@/emails/abandoned-cart'
import VipEmail from '@/emails/vip'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const previewSchema = z.object({
  // Tier 3 (React Email) identifier
  emailTemplateId: z.string().optional(),
  subject: z.string().optional(),
  headline: z.string().optional(),
  body: z.string().optional(),
  ctaText: z.string().optional(),
  discountCode: z.string().optional(),
  // Phase 14: Tier 1/2 identifiers
  /** UUID FK — resolves Tier 2 (linked email template from library) */
  linkedEmailTemplateId: z.string().uuid().optional(),
  /** True = fetch customTemplateHtml from the automation row (Tier 1 server-side) */
  hasCustomTemplate: z.boolean().optional(),
})

// ─── Default subjects per template ────────────────────────────────────────────

const SUBJECT_MAP: Record<string, string> = {
  welcome: 'Welcome to the family!',
  winback: "We miss you — it's been a while",
  repurchase: 'Time to restock?',
  abandoned_cart: 'You left something behind',
  vip: "You're a VIP!",
}

// ─── Preview variable substitution values ─────────────────────────────────────

function previewVars(discountCode?: string): Record<string, string> {
  return {
    customer_name: 'Preview Customer',
    store_name: env.RESEND_FROM_NAME ?? 'EcomCRM Store',
    unsubscribe_url: '#',
    discount_code: discountCode ?? 'PREVIEW10',
    shop_url: env.SHOPIFY_STORE_URL ?? '#',
  }
}

// ─── POST /api/automations/[id]/preview ───────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  const shopId = new URL(env.SHOPIFY_STORE_URL).hostname

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = previewSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  const {
    emailTemplateId,
    subject,
    headline,
    body: customBody,
    ctaText,
    discountCode,
    linkedEmailTemplateId,
    hasCustomTemplate,
  } = parsed.data

  // ── Tier 1: Fetch customTemplateHtml from automation row ─────────────────
  if (hasCustomTemplate) {
    const [automationRow] = await db
      .select({ customTemplateHtml: automations.customTemplateHtml })
      .from(automations)
      .where(and(eq(automations.id, id), eq(automations.shopId, shopId)))
      .limit(1)

    if (automationRow?.customTemplateHtml) {
      const html = substituteVariables(automationRow.customTemplateHtml, previewVars(discountCode))
      return Response.json({
        html,
        subject: subject ?? 'Custom Template Preview',
      })
    }
    // Fall through if customTemplateHtml is null (defensive)
  }

  // ── Tier 2: Linked email template from library ────────────────────────────
  if (linkedEmailTemplateId) {
    const template = await getEmailTemplate(shopId, linkedEmailTemplateId)
    if (template?.html) {
      const html = substituteVariables(template.html, previewVars(discountCode))
      return Response.json({
        html,
        subject: subject ?? template.name,
      })
    }
    // If linked template has no HTML yet, fall through to Tier 3
  }

  // ── Tier 3: React Email template (original behavior) ─────────────────────
  if (!emailTemplateId) {
    return Response.json({ error: 'No template specified' }, { status: 400 })
  }

  const storeName = env.RESEND_FROM_NAME
  const customerName = 'Preview Customer'
  const unsubscribeUrl = '#'

  let element: React.ReactElement | null = null

  switch (emailTemplateId) {
    case 'welcome':
      element = React.createElement(WelcomeEmail, {
        storeName,
        customerName,
        unsubscribeUrl,
        customHeadline: headline,
        customBody,
        customCtaText: ctaText,
      })
      break

    case 'winback':
      element = React.createElement(WinbackEmail, {
        storeName,
        customerName,
        daysSinceLastOrder: 90,
        shopUrl: '#',
        unsubscribeUrl,
        incentive: discountCode ? `Use code ${discountCode}` : undefined,
        customHeadline: headline,
        customBody,
        customCtaText: ctaText,
      })
      break

    case 'repurchase':
      element = React.createElement(RepurchaseEmail, {
        storeName,
        customerName,
        lastOrderDate: 'January 15, 2026',
        shopUrl: '#',
        unsubscribeUrl,
        customHeadline: headline,
        customBody,
        customCtaText: ctaText,
      })
      break

    case 'abandoned_cart':
      element = React.createElement(AbandonedCartEmail, {
        storeName,
        customerName,
        cartItems: [
          { title: 'Sample Product', price: '$29.00' },
        ],
        cartUrl: '#',
        unsubscribeUrl,
        customHeadline: headline,
        customBody,
        customCtaText: ctaText,
      })
      break

    case 'vip':
      element = React.createElement(VipEmail, {
        storeName,
        customerName,
        totalSpent: '$1,240.00',
        orderCount: 12,
        shopUrl: '#',
        unsubscribeUrl,
        customHeadline: headline,
        customBody,
        customCtaText: ctaText,
      })
      break

    default:
      return Response.json({ error: `Unknown template: ${emailTemplateId}` }, { status: 400 })
  }

  const html = await render(element)

  return Response.json({
    html,
    subject: subject ?? SUBJECT_MAP[emailTemplateId] ?? emailTemplateId,
  })
}
