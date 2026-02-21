import { Resend } from 'resend'
import { render } from '@react-email/render'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { automations } from '@/lib/db/schema'
import { env } from '@/lib/env'
import WelcomeEmail from '@/emails/welcome'
import WinbackEmail from '@/emails/winback'
import VipEmail from '@/emails/vip'
import RepurchaseEmail from '@/emails/repurchase'
import AbandonedCartEmail from '@/emails/abandoned-cart'
import type { ReactElement } from 'react'

const resend = new Resend(env.RESEND_API_KEY)

const bodySchema = z.object({
  email: z.string().email(),
})

function buildTestTemplate(
  templateId: string | null,
  storeName: string,
  unsubscribeUrl: string
): ReactElement {
  switch (templateId) {
    case 'winback':
      return WinbackEmail({
        storeName,
        customerName: 'Test Customer',
        daysSinceLastOrder: 90,
        incentive: '10% off your next order',
        shopUrl: env.SHOPIFY_STORE_URL,
        unsubscribeUrl,
      })
    case 'vip':
      return VipEmail({
        storeName,
        customerName: 'Test Customer',
        totalSpent: '1,250.00',
        orderCount: 12,
        perks: ['Early access to new products', 'Free shipping on all orders', 'Exclusive VIP discounts'],
        shopUrl: env.SHOPIFY_STORE_URL,
        unsubscribeUrl,
      })
    case 'repurchase':
      return RepurchaseEmail({
        storeName,
        customerName: 'Test Customer',
        lastOrderDate: new Date(Date.now() - 30 * 86400000).toLocaleDateString(),
        unsubscribeUrl,
        shopUrl: env.SHOPIFY_STORE_URL,
      })
    case 'abandoned-cart':
      return AbandonedCartEmail({
        storeName,
        customerName: 'Test Customer',
        cartItems: [{ title: 'Sample Product', price: '$49.00' }],
        cartUrl: env.SHOPIFY_STORE_URL,
        unsubscribeUrl,
      })
    default:
      return WelcomeEmail({
        storeName,
        customerName: 'Test Customer',
        unsubscribeUrl,
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

    const body = await request.json() as unknown
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 })
    }
    const { email } = parsed.data

    const [automation] = await db
      .select()
      .from(automations)
      .where(and(eq(automations.id, id), eq(automations.shopId, shopId)))
      .limit(1)

    if (!automation) {
      return Response.json({ error: 'Automation not found' }, { status: 404 })
    }

    const storeName = env.RESEND_FROM_NAME
    const unsubscribeUrl = `${env.APP_URL}/unsubscribe?test=true`

    const element = buildTestTemplate(automation.emailTemplateId, storeName, unsubscribeUrl)
    const html = await render(element)

    const { data, error } = await resend.emails.send({
      from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
      to: email,
      subject: `[TEST] ${automation.name}`,
      html,
    })

    if (error || !data) {
      return Response.json({ error: error?.message ?? 'Send failed' }, { status: 500 })
    }

    return Response.json({ sent: true, resendId: data.id })
  } catch (err) {
    console.error('[send-test] error:', err)
    return Response.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
