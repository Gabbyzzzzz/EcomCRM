import { NextRequest } from 'next/server'
import * as React from 'react'
import { render } from '@react-email/render'
import { z } from 'zod'
import { env } from '@/lib/env'
import WelcomeEmail from '@/emails/welcome'
import WinbackEmail from '@/emails/winback'
import RepurchaseEmail from '@/emails/repurchase'
import AbandonedCartEmail from '@/emails/abandoned-cart'
import VipEmail from '@/emails/vip'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const previewSchema = z.object({
  emailTemplateId: z.string(),
  subject: z.string().optional(),
  headline: z.string().optional(),
  body: z.string().optional(),
  ctaText: z.string().optional(),
  discountCode: z.string().optional(),
})

// ─── Default subjects per template ────────────────────────────────────────────

const SUBJECT_MAP: Record<string, string> = {
  welcome: 'Welcome to the family!',
  winback: "We miss you — it's been a while",
  repurchase: 'Time to restock?',
  abandoned_cart: 'You left something behind',
  vip: "You're a VIP!",
}

// ─── POST /api/automations/[id]/preview ───────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  // params unused but must be present for Next.js route type
  await params

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

  const { emailTemplateId, subject, headline, body: customBody, ctaText, discountCode } = parsed.data

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
