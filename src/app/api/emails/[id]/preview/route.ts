import { render } from '@react-email/render'
import { env } from '@/lib/env'
import WelcomeEmail from '@/emails/welcome'
import WinbackEmail from '@/emails/winback'
import VipEmail from '@/emails/vip'
import RepurchaseEmail from '@/emails/repurchase'
import AbandonedCartEmail from '@/emails/abandoned-cart'
import type { ReactElement } from 'react'

const PREVIEW_UNSUBSCRIBE = `${env.APP_URL}/unsubscribe?preview=true`
const STORE_NAME = env.RESEND_FROM_NAME

function buildPreview(id: string): ReactElement | null {
  switch (id) {
    case 'welcome':
      return WelcomeEmail({
        storeName: STORE_NAME,
        customerName: 'Jane',
        unsubscribeUrl: PREVIEW_UNSUBSCRIBE,
      })
    case 'winback':
      return WinbackEmail({
        storeName: STORE_NAME,
        customerName: 'Jane',
        daysSinceLastOrder: 90,
        incentive: '10% off your next order',
        shopUrl: env.SHOPIFY_STORE_URL,
        unsubscribeUrl: PREVIEW_UNSUBSCRIBE,
      })
    case 'vip':
      return VipEmail({
        storeName: STORE_NAME,
        customerName: 'Jane',
        totalSpent: '1,250.00',
        orderCount: 12,
        perks: ['Early access to new products', 'Free shipping on all orders', 'Exclusive VIP discounts'],
        shopUrl: env.SHOPIFY_STORE_URL,
        unsubscribeUrl: PREVIEW_UNSUBSCRIBE,
      })
    case 'repurchase':
      return RepurchaseEmail({
        storeName: STORE_NAME,
        customerName: 'Jane',
        lastOrderDate: new Date(Date.now() - 30 * 86400000).toLocaleDateString(),
        shopUrl: env.SHOPIFY_STORE_URL,
        unsubscribeUrl: PREVIEW_UNSUBSCRIBE,
      })
    case 'abandoned-cart':
      return AbandonedCartEmail({
        storeName: STORE_NAME,
        customerName: 'Jane',
        cartItems: [
          { title: 'Sample Product A', price: '$49.00' },
          { title: 'Sample Product B', price: '$29.00' },
        ],
        cartUrl: env.SHOPIFY_STORE_URL,
        unsubscribeUrl: PREVIEW_UNSUBSCRIBE,
      })
    default:
      return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const element = buildPreview(id)

  if (!element) {
    return new Response('Template not found', { status: 404 })
  }

  const html = await render(element)
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
