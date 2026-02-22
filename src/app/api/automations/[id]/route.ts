import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { automations } from '@/lib/db/schema'
import { setAutomationEnabled } from '@/lib/db/queries'

const patchSchema = z.object({
  enabled: z.boolean(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  await setAutomationEnabled(id, parsed.data.enabled)

  const shopId = new URL(process.env.SHOPIFY_STORE_URL!).hostname
  const [updatedRow] = await db
    .select()
    .from(automations)
    .where(and(eq(automations.id, id), eq(automations.shopId, shopId)))
    .limit(1)

  if (!updatedRow) {
    return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, automation: { id: updatedRow.id, enabled: updatedRow.enabled } })
}
