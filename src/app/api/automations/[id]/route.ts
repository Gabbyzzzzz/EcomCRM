import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { automations } from '@/lib/db/schema'
import { setAutomationEnabled } from '@/lib/db/queries'
import { env } from '@/lib/env'

// ─── Trigger config schemas (per trigger type) ────────────────────────────────

const daysSinceOrderTriggerSchema = z.object({
  days: z.number(),
  segments: z.array(z.string()).optional(),
})

const segmentChangeTriggerSchema = z.object({
  toSegment: z.string(),
})

// ─── Patch schema ─────────────────────────────────────────────────────────────

const patchSchema = z.object({
  // Existing field — keep backward-compatible for toggle-only updates
  enabled: z.boolean().optional(),
  // Delay
  delayValue: z.number().nullable().optional(),
  delayUnit: z.string().nullable().optional(),
  // Trigger config — free-form but typed per trigger
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  // Action config — stores custom email content overrides
  actionConfig: z
    .object({
      subject: z.string().optional(),
      headline: z.string().optional(),
      body: z.string().optional(),
      ctaText: z.string().optional(),
      discountCode: z.string().optional(),
      alsoAddTag: z.string().optional(),
    })
    .optional(),
  // Phase 14: Template linking columns
  /** UUID FK to email_templates — links this automation to a library template */
  linkedEmailTemplateId: z.string().uuid().nullable().optional(),
  /** Flow-specific HTML override (Tier 1 — highest priority in 3-tier fallback) */
  customTemplateHtml: z.string().nullable().optional(),
  /** Flow-specific Unlayer design JSON stored alongside customTemplateHtml */
  customTemplateJson: z.unknown().nullable().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const shopId = new URL(env.SHOPIFY_STORE_URL).hostname
  const data = parsed.data

  // Determine if this is a toggle-only update (enabled field only, no other fields present)
  const hasConfigChanges =
    data.delayValue !== undefined ||
    data.delayUnit !== undefined ||
    data.triggerConfig !== undefined ||
    data.actionConfig !== undefined ||
    data.linkedEmailTemplateId !== undefined ||
    data.customTemplateHtml !== undefined ||
    data.customTemplateJson !== undefined

  if (!hasConfigChanges && data.enabled !== undefined) {
    // Toggle-only: use existing helper for backward compatibility
    await setAutomationEnabled(id, data.enabled)
  } else {
    // Full config update: build update set from provided fields only
    const updateSet: Record<string, unknown> = {}

    if (data.enabled !== undefined) {
      updateSet.enabled = data.enabled
    }
    if (data.delayValue !== undefined) {
      updateSet.delayValue = data.delayValue
    }
    if (data.delayUnit !== undefined) {
      updateSet.delayUnit = data.delayUnit
    }
    if (data.triggerConfig !== undefined) {
      // Validate shape based on trigger type — fetch current row to know the type
      updateSet.triggerConfig = data.triggerConfig
    }
    if (data.actionConfig !== undefined) {
      updateSet.actionConfig = data.actionConfig
    }
    // Phase 14: template linking fields
    if (data.linkedEmailTemplateId !== undefined) {
      updateSet.linkedEmailTemplateId = data.linkedEmailTemplateId
    }
    if (data.customTemplateHtml !== undefined) {
      updateSet.customTemplateHtml = data.customTemplateHtml
    }
    if (data.customTemplateJson !== undefined) {
      updateSet.customTemplateJson = data.customTemplateJson
    }

    await db
      .update(automations)
      .set(updateSet)
      .where(and(eq(automations.id, id), eq(automations.shopId, shopId)))
  }

  // Write-then-read: SELECT the row back to confirm actual DB state
  const [updatedRow] = await db
    .select()
    .from(automations)
    .where(and(eq(automations.id, id), eq(automations.shopId, shopId)))
    .limit(1)

  if (!updatedRow) {
    return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, automation: updatedRow })
}
