import { db } from '@/lib/db'
import { automations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A row from the automations table as returned by Drizzle select.
 */
export type AutomationRow = typeof automations.$inferSelect

// ─── Engine helpers ───────────────────────────────────────────────────────────

/**
 * Fetch all enabled automations for a shop that match the given trigger type.
 *
 * Used by Inngest automation functions to get the list of automations to run
 * when a trigger event fires.
 */
export async function fetchEnabledAutomationsByTrigger(
  shopId: string,
  triggerType: string
): Promise<AutomationRow[]> {
  return db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.shopId, shopId),
        eq(automations.enabled, true),
        eq(automations.triggerType, triggerType as AutomationRow['triggerType'])
      )
    )
}

/**
 * Evaluate whether an automation's segment filter matches the given customer segment.
 *
 * Reads `automation.triggerConfig` as `{ segments?: string[] }`.
 * Returns true if:
 * - No segments filter is configured (automation fires for all customers), OR
 * - customerSegment is in the configured segments list.
 */
export function evaluateSegmentFilter(
  automation: AutomationRow,
  customerSegment: string | null
): boolean {
  const config = automation.triggerConfig as { segments?: string[] } | null
  if (!config?.segments || config.segments.length === 0) {
    return true
  }
  if (!customerSegment) {
    return false
  }
  return config.segments.includes(customerSegment)
}
