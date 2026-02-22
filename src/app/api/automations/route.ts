import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { automations } from '@/lib/db/schema'
import { env } from '@/lib/env'

// ─── Schema ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(255),
  triggerType: z.enum([
    'first_order',
    'segment_change',
    'days_since_order',
    'tag_added',
    'cart_abandoned',
  ]),
  triggerConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  delayValue: z.number().int().positive().nullable().optional(),
  delayUnit: z.enum(['minutes', 'hours', 'days']).nullable().optional(),
  linkedEmailTemplateId: z.string().uuid().nullable().optional(),
})

// ─── POST /api/automations ────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const shopId = new URL(env.SHOPIFY_STORE_URL).hostname
  const data = parsed.data

  const [row] = await db
    .insert(automations)
    .values({
      shopId,
      name: data.name,
      triggerType: data.triggerType,
      triggerConfig: data.triggerConfig ?? null,
      delayValue: data.delayValue ?? null,
      delayUnit: data.delayUnit ?? null,
      actionType: 'send_email',
      linkedEmailTemplateId: data.linkedEmailTemplateId ?? null,
      enabled: false,
    })
    .returning()

  return NextResponse.json(row, { status: 201 })
}
