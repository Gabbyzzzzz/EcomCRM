---
phase: 05-automation-engine
plan: 01
subsystem: automation
tags: [inngest, drizzle, resend, react-email, shopify-graphql, automation-engine]

# Dependency graph
requires:
  - phase: 04-email-infrastructure
    provides: sendMarketingEmail with templateFactory pattern, suppression gate, buildUnsubscribeUrl
  - phase: 03-rfm-engine
    provides: recalculateAllRfmScores emitting segment change data, rfm/segment.changed events
  - phase: 02-shopify-integration
    provides: shopifyGraphQL, upsertCustomer/upsertOrder, processShopifyWebhook Inngest function
provides:
  - fetchEnabledAutomationsByTrigger + evaluateSegmentFilter (engine.ts)
  - executeEmailAction with SUBJECT_MAP + templateFactory routing for 5 templates (actions.ts)
  - executeTagAction for Shopify tagsAdd/tagsRemove (best-effort)
  - PRESET_AUTOMATIONS constant with 5 automation flow configs (presets.ts)
  - 5 automation DB query functions in queries.ts
  - processFirstOrder Inngest function (automation/first_order event)
  - processSegmentChange Inngest function (rfm/segment.changed event)
  - processCartAbandoned Inngest function (automation/cart_abandoned event)
  - automations_shop_name_unique unique index on schema (upsertAutomation target)
affects:
  - 05-automation-engine/05-02
  - api/automations

# Tech tracking
tech-stack:
  added: []
  patterns:
    - fetchEnabledAutomationsByTrigger pattern: Inngest functions query enabled automations at runtime — no static config needed
    - eventTimestamp-from-event.data pattern: processSegmentChange reads eventTimestamp from event.data (NOT new Date()) for idempotency key stability across retries
    - recalcTimestamp-before-loop pattern: dailyRfmRecalculation generates one timestamp before the loop, passes to all events for batch idempotency
    - best-effort tag sync: executeTagAction catches and logs, never throws — matches Phase 4 unsubscribe pattern
    - cart abandonment cancellation: DB check for orders post-eventTimestamp in step.run before send

key-files:
  created:
    - src/lib/automation/engine.ts
    - src/lib/automation/actions.ts
    - src/lib/automation/presets.ts
  modified:
    - src/lib/db/queries.ts
    - src/lib/db/schema.ts
    - src/inngest/functions.ts

key-decisions:
  - "eventTimestamp read from event.data in processSegmentChange — never generated locally with new Date() — prevents duplicate sends on Inngest retry by keeping idempotency key stable"
  - "recalcTimestamp generated ONCE before the segmentChanges loop in dailyRfmRecalculation — all events in a batch share the same timestamp so executeEmailAction idempotency key is consistent across retries"
  - "executeTagAction is best-effort (catch+log, no rethrow) — Shopify tag sync failure must not block automation engine or email compliance"
  - "automation/first_order emit wrapped in try/catch in processShopifyWebhook — event emission failure must not break webhook processing"
  - "orderCount guard for first_order: re-fetch customer row AFTER updateCustomerCountersFromOrders to get accurate count, only emit when orderCount === 1"
  - "AutomationRow type defined inline in queries.ts via typeof automations.$inferSelect to avoid circular imports with engine.ts"

patterns-established:
  - "Automation functions pattern: step.run('fetch-automations') → loop → step.sleep(delay) → step.run(execute)"
  - "Idempotency key format: ${automationId}-${customerId}-${eventTimestamp} — stable across retries"
  - "Template routing: switch on emailTemplateId → build templateFactory → pass to sendMarketingEmail"

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 5 Plan 1: Automation Engine Core Summary

**Inngest automation engine with processFirstOrder (1h delay + welcome email), processSegmentChange (VIP email + Shopify tag on champion transition), and processCartAbandoned (2h sleep + order-placed cancellation check), wired to 5 preset automation configs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T13:53:27Z
- **Completed:** 2026-02-19T13:56:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created automation engine helpers: `fetchEnabledAutomationsByTrigger` and `evaluateSegmentFilter` for Inngest functions to query and filter automations at runtime
- Created `executeEmailAction` with SUBJECT_MAP and templateFactory routing for all 5 React Email templates (welcome, abandoned-cart, repurchase, winback, vip), with idempotency key format `${automationId}-${customerId}-${eventTimestamp}`
- Created `executeTagAction` for Shopify tagsAdd/tagsRemove mutations (best-effort, never throws)
- Added 5 preset automation configs (Welcome Flow, Abandoned Cart Recovery, Repurchase Prompt, Win-Back Campaign, VIP Welcome)
- Added 5 automation DB query functions to queries.ts
- Added `automations_shop_name_unique` unique index for upsertAutomation conflict target
- Extended `processShopifyWebhook` to emit `automation/first_order` when `orderCount === 1` after counter update
- Extended `dailyRfmRecalculation` to include stable `eventTimestamp` in all `rfm/segment.changed` events
- Three new Inngest functions (processFirstOrder, processSegmentChange, processCartAbandoned) added to functions array

## Task Commits

Each task was committed atomically:

1. **Task 1: Automation engine helpers + action executors** - `7e4a1d4` (feat)
2. **Task 2: Event-driven Inngest automation functions** - `b3dcbd6` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/automation/engine.ts` - fetchEnabledAutomationsByTrigger, evaluateSegmentFilter, AutomationRow type
- `src/lib/automation/actions.ts` - executeEmailAction (SUBJECT_MAP + templateFactory), executeTagAction
- `src/lib/automation/presets.ts` - PRESET_AUTOMATIONS constant with 5 flow configs
- `src/lib/db/queries.ts` - 5 new automation query functions + AutomationRow/AutomationInsert types
- `src/lib/db/schema.ts` - automations_shop_name_unique uniqueIndex added
- `src/inngest/functions.ts` - processFirstOrder, processSegmentChange, processCartAbandoned + orders/create first_order emit + dailyRfm eventTimestamp

## Decisions Made
- `eventTimestamp` read from `event.data` in `processSegmentChange` — never `new Date()` — prevents duplicate sends on Inngest retry
- `recalcTimestamp` generated ONCE before the segmentChanges loop in `dailyRfmRecalculation` — all events in a batch share the same timestamp
- `executeTagAction` is best-effort (catch+log, never rethrow) — matches Phase 4 unsubscribe Shopify tag sync pattern
- `AutomationRow` defined inline in queries.ts via `typeof automations.$inferSelect` to avoid circular imports with engine.ts
- `automation/first_order` emit wrapped in try/catch — event emission failure must not break webhook processing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Automation engine core is complete and ready for Phase 5 Plan 2 (API endpoints, automation management UI)
- `processCartAbandoned` function is wired and ready — only needs `automation/cart_abandoned` event emitter from Phase 6 checkouts/create webhook
- `PRESET_AUTOMATIONS` constant ready for seed script
- All 3 event-driven triggers tested via TypeScript strict mode (zero errors)

## Self-Check: PASSED

All created files exist. All task commits verified in git log.

---
*Phase: 05-automation-engine*
*Completed: 2026-02-19*
