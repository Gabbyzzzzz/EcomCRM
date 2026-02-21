/**
 * PRESET_AUTOMATIONS — the 5 default automation flow configurations.
 *
 * Used at DB seed time to populate the automations table.
 * Each entry omits id, shopId, and createdAt (added at seed time).
 *
 * VIP Welcome uses alsoAddTag in actionConfig to signal that executeTagAction
 * should run after the email send in the Inngest automation functions.
 */
export const PRESET_AUTOMATIONS = [
  {
    name: 'Welcome Flow',
    triggerType: 'first_order' as const,
    triggerConfig: {},
    delayValue: 1,
    delayUnit: 'hours',
    actionType: 'send_email' as const,
    actionConfig: {},
    emailTemplateId: 'welcome',
    enabled: true,
  },
  {
    name: 'Abandoned Cart Recovery',
    triggerType: 'cart_abandoned' as const,
    triggerConfig: {},
    delayValue: 2,
    delayUnit: 'hours',
    actionType: 'send_email' as const,
    actionConfig: {},
    emailTemplateId: 'abandoned-cart',
    enabled: true,
  },
  {
    name: 'Repurchase Prompt',
    triggerType: 'days_since_order' as const,
    triggerConfig: { days: 30, segments: ['loyal', 'new'] },
    delayValue: null,
    delayUnit: null,
    actionType: 'send_email' as const,
    actionConfig: {},
    emailTemplateId: 'repurchase',
    enabled: true,
  },
  {
    name: 'Win-Back Campaign',
    triggerType: 'days_since_order' as const,
    triggerConfig: { days: 90, segments: ['at_risk', 'hibernating'] },
    delayValue: null,
    delayUnit: null,
    actionType: 'send_email' as const,
    actionConfig: {},
    emailTemplateId: 'winback',
    enabled: true,
  },
  {
    name: 'VIP Welcome',
    triggerType: 'segment_change' as const,
    triggerConfig: { toSegment: 'champion' },
    delayValue: null,
    delayUnit: null,
    actionType: 'send_email' as const,
    actionConfig: { alsoAddTag: 'vip' },
    emailTemplateId: 'vip',
    enabled: true,
  },
] as const
