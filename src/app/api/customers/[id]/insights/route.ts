import { env } from '@/lib/env'
import { getCustomerProfile } from '@/lib/db/queries'
import { generateCustomerInsight, type CustomerInsightData } from '@/lib/ai/insights'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const shopId = new URL(env.SHOPIFY_STORE_URL).hostname

    const customer = await getCustomerProfile(shopId, id)

    if (!customer) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const daysSinceLastOrder =
      customer.lastOrderAt != null
        ? Math.floor((Date.now() - new Date(customer.lastOrderAt).getTime()) / 86400000)
        : null

    const data: CustomerInsightData = {
      name: customer.name ?? null,
      email: customer.email ?? '',
      segment: customer.segment ?? null,
      rfmR: customer.rfmR ?? null,
      rfmF: customer.rfmF ?? null,
      rfmM: customer.rfmM ?? null,
      totalSpent: customer.totalSpent != null ? customer.totalSpent.toString() : '0',
      orderCount: customer.orderCount ?? 0,
      avgOrderValue: customer.avgOrderValue != null ? customer.avgOrderValue.toString() : '0',
      firstOrderAt: customer.firstOrderAt != null ? customer.firstOrderAt.toISOString() : null,
      lastOrderAt: customer.lastOrderAt != null ? customer.lastOrderAt.toISOString() : null,
      daysSinceLastOrder,
    }

    const insight = await generateCustomerInsight(data)

    return Response.json({ insight })
  } catch (error) {
    console.error('[/api/customers/[id]/insights]', error)
    return Response.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
