import { NextResponse } from 'next/server'
import { z } from 'zod'
import { inngest } from '@/inngest/client'
import { db } from '@/lib/db'
import { customers as customersTable } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { env } from '@/lib/env'
import { fetchEnabledAutomationsByTrigger } from '@/lib/automation/engine'
import { executeEmailAction } from '@/lib/automation/actions'

// ─── Guard: Development only ──────────────────────────────────────────────────
// This endpoint is for local development and debugging only.
// It bypasses trigger events and directly fires automation actions.
// It MUST NOT be accessible in production.

// ─── Request schema ───────────────────────────────────────────────────────────

const bodySchema = z.object({
  triggerType: z.enum(['first_order', 'segment_change', 'days_since_order', 'cart_abandoned']),
  customerId: z.string().uuid('customerId must be a valid UUID (internal customer ID)'),
  newSegment: z.string().optional(),
})

// ─── POST /api/automations/test-trigger ──────────────────────────────────────

/**
 * Manually fire any automation trigger type for testing.
 *
 * Trigger type coverage:
 * - first_order     → covers Welcome Flow
 * - segment_change  → covers VIP Welcome
 * - days_since_order → covers Repurchase Prompt AND Win-Back Campaign (both preset automations)
 * - cart_abandoned  → covers Abandoned Cart Recovery
 *
 * For days_since_order: directly calls fetchEnabledAutomationsByTrigger + executeEmailAction
 * instead of sending an Inngest event, because this trigger is cron-driven (not event-driven).
 * This exercises the exact same action execution path the cron uses.
 *
 * IMPORTANT: Returns 403 in production (process.env.NODE_ENV === 'production').
 */
export async function POST(request: Request): Promise<Response> {
  // ── Guard: block in production ────────────────────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is not available in production' },
      { status: 403 }
    )
  }

  // ── Parse and validate body ───────────────────────────────────────────────
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { triggerType, customerId, newSegment } = parsed.data

  // ── Derive shopId from env ────────────────────────────────────────────────
  const shopId = new URL(env.SHOPIFY_STORE_URL).hostname

  // ── Look up customer by internal UUID ────────────────────────────────────
  const [customer] = await db
    .select({
      id: customersTable.id,
      shopifyId: customersTable.shopifyId,
      email: customersTable.email,
      name: customersTable.name,
    })
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, customerId),
        eq(customersTable.shopId, shopId)
      )
    )
    .limit(1)

  if (!customer) {
    return NextResponse.json(
      { error: `Customer not found: id=${customerId} shopId=${shopId}` },
      { status: 404 }
    )
  }

  const eventTimestamp = new Date().toISOString()

  // ── Fire the appropriate trigger ──────────────────────────────────────────
  switch (triggerType) {
    case 'first_order': {
      // [pipeline] test-trigger: emitting automation/first_order for customer=${customerId}
      console.log(`[pipeline] test-trigger: emitting automation/first_order for customer=${customerId}`)
      await inngest.send({
        name: 'automation/first_order',
        data: {
          shopId,
          customerId: customer.id,
          shopifyCustomerId: customer.shopifyId,
          eventTimestamp,
        },
      })
      return NextResponse.json({
        ok: true,
        triggerType,
        eventSent: true,
        customerId: customer.id,
        customerEmail: customer.email,
        note: 'automation/first_order event sent to Inngest — check Inngest dashboard for processFirstOrder invocation',
      })
    }

    case 'segment_change': {
      const resolvedSegment = newSegment ?? 'champion'
      // [pipeline] test-trigger: emitting rfm/segment.changed for customer=${customerId} newSegment=${resolvedSegment}
      console.log(`[pipeline] test-trigger: emitting rfm/segment.changed for customer=${customerId} newSegment=${resolvedSegment}`)
      await inngest.send({
        name: 'rfm/segment.changed',
        data: {
          shopId,
          customerId: customer.id,
          oldSegment: null,
          newSegment: resolvedSegment,
          eventTimestamp,
        },
      })
      return NextResponse.json({
        ok: true,
        triggerType,
        eventSent: true,
        customerId: customer.id,
        customerEmail: customer.email,
        newSegment: resolvedSegment,
        note: 'rfm/segment.changed event sent to Inngest — check Inngest dashboard for processSegmentChange invocation',
      })
    }

    case 'days_since_order': {
      // days_since_order is cron-driven, not event-driven.
      // Directly execute the action for each enabled automation to give immediate feedback.
      // This exercises the same action execution path the cron uses.
      // (Cron wiring is confirmed correct in Task 1 audit — see checkDaysSinceOrder docblock.)
      // [pipeline] test-trigger: direct execution of days_since_order automations for customer=${customerId}
      console.log(`[pipeline] test-trigger: direct execution of days_since_order automations for customer=${customerId}`)

      const automations = await fetchEnabledAutomationsByTrigger(shopId, 'days_since_order')

      if (automations.length === 0) {
        return NextResponse.json({
          ok: true,
          triggerType,
          directExecution: true,
          customerId: customer.id,
          automationsExecuted: 0,
          note: 'No enabled days_since_order automations found for this shop',
        })
      }

      const results: Array<{ automationId: string; automationName: string; emailTemplateId: string }> = []

      for (const automation of automations) {
        // [pipeline] test-trigger: executing automation=${automation.id} name=${automation.name}
        console.log(`[pipeline] test-trigger: executing automation=${automation.id} name=${automation.name}`)
        await executeEmailAction({
          shopId,
          customerId: customer.id,
          automationId: automation.id,
          emailTemplateId: automation.emailTemplateId ?? 'repurchase',
          eventTimestamp,
        })
        results.push({
          automationId: automation.id,
          automationName: automation.name,
          emailTemplateId: automation.emailTemplateId ?? 'repurchase',
        })
      }

      return NextResponse.json({
        ok: true,
        triggerType,
        directExecution: true,
        customerId: customer.id,
        customerEmail: customer.email,
        automationsExecuted: results.length,
        automations: results,
        note: 'days_since_order automations executed directly (bypasses cron schedule) — check message_logs table for send results',
      })
    }

    case 'cart_abandoned': {
      // [pipeline] test-trigger: emitting automation/cart_abandoned for customer=${customerId}
      console.log(`[pipeline] test-trigger: emitting automation/cart_abandoned for customer=${customerId}`)
      await inngest.send({
        name: 'automation/cart_abandoned',
        data: {
          shopId,
          customerId: customer.id,
          shopifyCustomerId: customer.shopifyId,
          cartToken: `test-${Date.now()}`,
          eventTimestamp,
        },
      })
      return NextResponse.json({
        ok: true,
        triggerType,
        eventSent: true,
        customerId: customer.id,
        customerEmail: customer.email,
        note: 'automation/cart_abandoned event sent to Inngest — check Inngest dashboard for processCartAbandoned invocation (has 2h delay by default)',
      })
    }
  }
}
