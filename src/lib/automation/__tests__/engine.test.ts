import { describe, it, expect } from 'vitest'
import { evaluateSegmentFilter } from '../engine'
import type { AutomationRow } from '../engine'

// Helper to create a minimal automation row with the given triggerConfig
function makeAutomation(triggerConfig: Record<string, unknown> | null): AutomationRow {
  return {
    id: 'test-id',
    shopId: 'shop-1',
    name: 'Test Automation',
    triggerType: 'first_order',
    triggerConfig,
    delayValue: 0,
    delayUnit: 'hours',
    actionType: 'send_email',
    actionConfig: null,
    emailTemplateId: 'welcome',
    enabled: true,
    lastRunAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customTemplateHtml: null,
    linkedEmailTemplateId: null,
  }
}

describe('evaluateSegmentFilter', () => {
  // ── No filter configured → always matches ──
  it('returns true when triggerConfig is null', () => {
    const automation = makeAutomation(null)
    expect(evaluateSegmentFilter(automation, 'champion')).toBe(true)
    expect(evaluateSegmentFilter(automation, null)).toBe(true)
  })

  it('returns true when triggerConfig has no segments key', () => {
    const automation = makeAutomation({ someOtherKey: 'value' })
    expect(evaluateSegmentFilter(automation, 'loyal')).toBe(true)
  })

  it('returns true when segments array is empty', () => {
    const automation = makeAutomation({ segments: [] })
    expect(evaluateSegmentFilter(automation, 'at_risk')).toBe(true)
  })

  // ── Filter configured → matches only listed segments ──
  it('returns true when customer segment is in the list', () => {
    const automation = makeAutomation({ segments: ['champion', 'loyal'] })
    expect(evaluateSegmentFilter(automation, 'champion')).toBe(true)
    expect(evaluateSegmentFilter(automation, 'loyal')).toBe(true)
  })

  it('returns false when customer segment is not in the list', () => {
    const automation = makeAutomation({ segments: ['champion', 'loyal'] })
    expect(evaluateSegmentFilter(automation, 'lost')).toBe(false)
    expect(evaluateSegmentFilter(automation, 'at_risk')).toBe(false)
  })

  // ── Null customer segment with filter ──
  it('returns false when customer segment is null and filter is configured', () => {
    const automation = makeAutomation({ segments: ['champion'] })
    expect(evaluateSegmentFilter(automation, null)).toBe(false)
  })
})
