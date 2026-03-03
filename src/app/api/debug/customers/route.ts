import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  const shopId = new URL(env.SHOPIFY_STORE_URL).hostname

  const rows = await db.execute<{ shopify_id: string; name: string; deleted_at: string | null }>(sql`
    SELECT shopify_id, name, deleted_at
    FROM ${customers}
    WHERE shop_id = ${shopId}
    ORDER BY created_at
  `)

  return Response.json({
    shopId,
    count: rows.length,
    customers: rows.map(r => ({
      shopify_id: r.shopify_id,
      name: r.name,
      deleted_at: r.deleted_at,
    })),
  })
}
