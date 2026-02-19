import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { env } from '@/lib/env'
import { CustomerFilters } from '@/components/customer-filters'
import { and, eq, isNull, desc } from 'drizzle-orm'

export const metadata = {
  title: 'Customers | EcomCRM',
}

// ─── CustomersPage — Server Component ─────────────────────────────────────────
//
// Fetches the first page of customers server-side so the page renders with data
// immediately (no flash of empty content). Subsequent filter/pagination fetches
// are handled client-side by CustomerFilters via /api/customers.

export default async function CustomersPage() {
  const shopId = new URL(env.SHOPIFY_STORE_URL).hostname

  // Fetch initial page of customers (page 1, limit 20, no filters)
  const whereClause = and(eq(customers.shopId, shopId), isNull(customers.deletedAt))

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: db.$count(customers, whereClause) })
      .from(customers)
      .where(whereClause)
      .then(([r]) => r?.count ?? 0),
    db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
      .limit(20)
      .offset(0),
  ])

  const total = Number(countResult)

  const initialData = {
    customers: rows.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      segment: c.segment,
      totalSpent: c.totalSpent,
      orderCount: c.orderCount,
      avgOrderValue: c.avgOrderValue,
      lastOrderAt: c.lastOrderAt ? c.lastOrderAt.toISOString() : null,
      tags: c.tags,
      rfmR: c.rfmR,
      rfmF: c.rfmF,
      rfmM: c.rfmM,
    })),
    pagination: {
      page: 1,
      limit: 20,
      total,
      totalPages: Math.ceil(total / 20),
    },
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and search your customer database
        </p>
      </div>

      {/* Interactive filters + table — Client Component */}
      <CustomerFilters initialData={initialData} />
    </div>
  )
}
