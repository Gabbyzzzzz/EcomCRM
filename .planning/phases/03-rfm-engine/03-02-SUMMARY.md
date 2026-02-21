---
phase: 03-rfm-engine
plan: "02"
subsystem: infra
tags: [inngest, rfm, cron, segment, webhooks, events]

# Dependency graph
requires:
  - phase: 03-rfm-engine/03-01
    provides: recalculateAllRfmScores function and updateCustomerCountersFromOrders in queries.ts
  - phase: 02-shopify-integration
    provides: processShopifyWebhook Inngest function, upsertOrder, shopId pattern
provides:
  - dailyRfmRecalculation Inngest cron function running at 2 AM UTC
  - rfm/segment.changed event emission on segment shifts
  - Per-order real-time customer counter updates via updateCustomerCountersFromOrders
affects: [05-automations, phase-5-email-flows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inngest step.run() wrapping expensive DB operations for resumable checkpointing
    - Batch inngest.send() for emitting multiple events in one call
    - Static imports replacing dynamic await import() for always-executed code paths
    - Counter updates (per-event) vs full quintile recalculation (daily cron) separation

key-files:
  created: []
  modified:
    - src/inngest/functions.ts

key-decisions:
  - "dailyRfmRecalculation uses step.run() for two distinct Inngest steps: scoring and event-emission are independently resumable on retry"
  - "Counter updates (order_count, total_spent, avg_order_value) run per-order-event; full NTILE quintile recalculation runs only in daily cron to avoid expensive window queries on every webhook"
  - "rfm/segment.changed events are batch-sent via inngest.send([...]) array form — one network call for all changes"
  - "Static imports (db, customersTable, syncLogs, eq, and) replace dynamic await import() in bulk_operations/finish case for consistency and simplicity"

patterns-established:
  - "RFM-04: Counter updates are always per-customer and per-event; never full table re-score on webhook"
  - "RFM-05: Full quintile recalculation via 0 2 * * * cron using NTILE(5) PostgreSQL window functions"
  - "Segment change events (rfm/segment.changed) contain {shopId, customerId, oldSegment, newSegment} for automation engine consumption"

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 3 Plan 02: RFM Inngest Integration Summary

**Daily 2 AM cron calls recalculateAllRfmScores and emits rfm/segment.changed events per shifted customer; order webhooks now recalculate customer counters in real-time via updateCustomerCountersFromOrders**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T12:20:57Z
- **Completed:** 2026-02-19T12:23:09Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added `dailyRfmRecalculation` Inngest cron (0 2 * * *) with Inngest step checkpointing for scoring + event emission
- Batch-emits `rfm/segment.changed` events for all customers whose segment label changed — consumed by Phase 5 automation engine
- Enhanced `orders/create` and `orders/updated` webhook handler to call `updateCustomerCountersFromOrders` after upsertOrder, updating order_count/total_spent/avg_order_value/first_order_at/last_order_at per customer in real-time
- Converted `bulk_operations/finish` from dynamic `await import()` to static imports (db, schema, drizzle-orm) for consistency

## Task Commits

Each task was committed atomically:

1. **Task 1: Daily RFM recalculation cron with segment change events** - `c74058d` (feat)
2. **Task 2: Per-order customer counter update in webhook handler** - `c74058d` (feat)

*(Both tasks implemented in one file write; combined into single atomic commit)*

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/inngest/functions.ts` - Added dailyRfmRecalculation cron function + per-order counter updates in webhook handler; 4 functions now registered in exports array

## Decisions Made
- Used `step.run()` for separate Inngest steps in `dailyRfmRecalculation` so NTILE scoring and event emission are independently resumable: if the function fails after scoring but before emitting events, retry skips the expensive query
- Counter updates per order event (cheap: single-customer aggregation from orders table) kept separate from full quintile recalculation (expensive: NTILE over all customers) — avoids unnecessary load on high-volume stores
- Batch `inngest.send([...])` used for segment change events rather than per-customer `inngest.send()` calls
- Static imports used throughout instead of dynamic `await import()` since db/schema/drizzle-orm are always needed in the order paths (no conditional execution)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Cleanup] Converted dynamic imports to static in bulk_operations/finish case**
- **Found during:** Task 2 (per-order counter update)
- **Issue:** Plan noted the inconsistency — bulk_operations/finish used `await import('@/lib/db')` etc. while Task 2 added static imports at file top for the same modules
- **Fix:** Removed the dynamic `await import()` calls inside `bulk_operations/finish`; now uses the same static `db`, `syncLogs`, `eq`, `and` imports used elsewhere in the file
- **Files modified:** src/inngest/functions.ts
- **Verification:** TypeScript passes, grep confirms no dynamic import() in the file for these modules
- **Committed in:** c74058d (part of task commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - cleanup/consistency)
**Impact on plan:** The plan itself suggested this consolidation ("consider converting the customer lookup to use the already-imported db and schema"). No scope creep.

## Issues Encountered
- `npx tsc --noEmit` failed due to broken `node_modules/.bin/tsc` shim pointing to non-existent `../lib/tsc.js`; used `node node_modules/typescript/lib/_tsc.js` directly — TypeScript passed with zero errors (pre-existing `.next/types` stubs excluded as they are Next.js generated artifacts, not project source)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 3 is complete: RFM engine (NTILE scoring) + Inngest wiring (daily cron + per-order counters + segment events) both done
- Phase 4 (email templates) can begin — no RFM dependency
- Phase 5 (automation engine) can consume `rfm/segment.changed` events emitted by `dailyRfmRecalculation`

---
*Phase: 03-rfm-engine*
*Completed: 2026-02-19*
