import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { env } from '@/lib/env'
import { and, eq, isNull, or, ilike, desc, sql, SQL } from 'drizzle-orm'

// ─── Segment enum values ───────────────────────────────────────────────────────

type CustomerSegment = 'champion' | 'loyal' | 'potential' | 'new' | 'at_risk' | 'hibernating' | 'lost'

const VALID_SEGMENTS: CustomerSegment[] = [
  'champion',
  'loyal',
  'potential',
  'new',
  'at_risk',
  'hibernating',
  'lost',
]

// ─── Query parameter schema ────────────────────────────────────────────────────

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional().default(''),
  segment: z.string().optional().default(''),
})

// ─── GET /api/customers ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query params
    const { searchParams } = request.nextUrl
    const parsed = querySchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      segment: searchParams.get('segment') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      )
    }

    const { page, limit, search } = parsed.data
    const rawSegment = parsed.data.segment
    const shopId = new URL(env.SHOPIFY_STORE_URL).hostname

    // Validate segment value if provided
    const segment: CustomerSegment | null =
      rawSegment && VALID_SEGMENTS.includes(rawSegment as CustomerSegment)
        ? (rawSegment as CustomerSegment)
        : null

    if (rawSegment && !segment) {
      return NextResponse.json(
        { error: `Invalid segment value: ${rawSegment}` },
        { status: 400 }
      )
    }

    // Build WHERE conditions
    const conditions: SQL[] = [
      eq(customers.shopId, shopId),
      isNull(customers.deletedAt),
    ]

    if (segment) {
      conditions.push(eq(customers.segment, segment))
    }

    if (search) {
      conditions.push(
        or(
          ilike(customers.name, `%${search}%`),
          ilike(customers.email, `%${search}%`)
        ) as SQL
      )
    }

    const whereClause = and(...conditions)

    // COUNT query
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(whereClause)

    const total = Number(countResult?.count ?? 0)

    // Data query
    const rows = await db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset((page - 1) * limit)

    return NextResponse.json({
      customers: rows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        segment: c.segment,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount,
        avgOrderValue: c.avgOrderValue,
        lastOrderAt: c.lastOrderAt,
        tags: c.tags,
        rfmR: c.rfmR,
        rfmF: c.rfmF,
        rfmM: c.rfmM,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[GET /api/customers] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
