---
phase: 03-rfm-engine
plan: "01"
subsystem: database
tags: [rfm, postgres, drizzle, ntile, decimal, window-functions, segmentation]

# Dependency graph
requires:
  - phase: 02-shopify-integration
    provides: customers and orders tables with Drizzle schema, Decimal money convention, upsertCustomer/upsertOrder queries

provides:
  - RFM scoring engine with PostgreSQL NTILE(5) window functions (src/lib/rfm/engine.ts)
  - mapRfmToSegment pure function covering all 125 R/F/M combinations → 7 segments
  - SEGMENT_MAP documentation record
  - updateCustomerCountersFromOrders SQL-aggregate query (src/lib/db/queries.ts)
  - CustomerSegment type and SegmentChange interface

affects:
  - 03-rfm-engine/03-02 (Inngest cron and webhook handlers that call recalculateAllRfmScores)
  - 04-email-automation (segment labels drive automation triggers)
  - 05-dashboard (segment distribution charts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NTILE(5) window functions in PostgreSQL for quintile-based RFM scoring — never in application memory"
    - "db.execute<T extends Record<string,unknown>>(sql`...`) for raw SQL returning typed rows"
    - "sql.raw() used only for internal validated values (UUIDs, integers, enum strings) in batch UPDATE arrays"
    - "Decimal used for all money arithmetic; Number() only for NTILE integer scores"
    - "Batch UPDATE via unnest(ARRAY[...]::uuid[]) FROM VALUES pattern in chunks of 100"

key-files:
  created:
    - src/lib/rfm/engine.ts
  modified:
    - src/lib/db/queries.ts

key-decisions:
  - "db.execute<T>() returns RowList<T[]> which IS the array directly — no .rows property needed"
  - "T passed to db.execute<T> must extend Record<string,unknown> per drizzle-orm postgres-js constraint"
  - "mapRfmToSegment priority: champion > loyal > new > potential > at_risk > hibernating > lost"
  - "Batch UPDATE uses sql.raw() for internal UUID/int/enum arrays — safe because values come from DB query results, not user input"
  - "NTILE ordering: ASC NULLS FIRST for all three dimensions so NULL/zero customers always receive quintile 1 (lowest score)"

patterns-established:
  - "RFM scoring: all 125 combinations covered by 7 priority-ordered if-conditions in mapRfmToSegment"
  - "Customer counter recalculation: SQL aggregation only, Decimal for money, no row loading into JS"

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 3 Plan 01: RFM Engine — Scoring Engine and Counter Recalculation Summary

**PostgreSQL NTILE(5) RFM scoring engine mapping 125 score combinations to 7 customer segments, plus SQL-aggregate customer counter recalculation using Decimal arithmetic**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T12:15:28Z
- **Completed:** 2026-02-19T12:18:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src/lib/rfm/engine.ts` with `recalculateAllRfmScores`, `mapRfmToSegment`, `SEGMENT_MAP`, `CustomerSegment`, and `SegmentChange` exports
- NTILE(5) window functions execute entirely in PostgreSQL with correct ASC NULLS FIRST ordering so NULL/zero customers receive quintile 1
- All 125 R/F/M score combinations map to exactly one of 7 segments via priority-ordered if-chain
- Batch UPDATE uses unnest() array pattern in chunks of 100 to minimize round-trips
- Added `updateCustomerCountersFromOrders` to `queries.ts` using SQL COUNT/SUM/MIN/MAX aggregation and Decimal for avgOrderValue

## Task Commits

Each task was committed atomically:

1. **Task 1: RFM scoring engine with NTILE(5) and segment mapping** - `6b8dfb8` (feat)
2. **Task 2: Customer counter recalculation query** - `9998f59` (feat)

## Files Created/Modified

- `src/lib/rfm/engine.ts` - RFM scoring engine: NTILE(5) in PostgreSQL, mapRfmToSegment, SEGMENT_MAP, types
- `src/lib/db/queries.ts` - Added updateCustomerCountersFromOrders; added sql import from drizzle-orm

## Decisions Made

- `db.execute<T>()` returns `RowList<T[]>` (which IS the array) — no `.rows` property exists; accessing it caused TS error TS2339
- `T` passed to `db.execute<T>` must extend `Record<string, unknown>` per drizzle-orm postgres-js constraint — `ScoreRow` uses `extends Record<string, unknown>`
- `mapRfmToSegment` priority order chosen so higher-value segments (champion, loyal) take precedence over lower ones; `new` placed before `potential` so recent-but-infrequent buyers are correctly identified as new
- `sql.raw()` used for internal UUID/int/enum arrays inside batch UPDATE — values sourced from our own SELECT result, never from user input

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed invalid `.rows` accessor on RowList result**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** `db.execute<ScoreRow>()` returns `RowList<ScoreRow[]>` which extends the array directly. Accessing `.rows` caused TS error TS2339.
- **Fix:** Used result directly as the array (no `.rows`); added explicit `ScoreRow` type annotation on `.map()` callback
- **Files modified:** src/lib/rfm/engine.ts
- **Verification:** `tsc --noEmit` passes with zero errors in src/
- **Committed in:** 6b8dfb8 (Task 1 commit)

**2. [Rule 3 - Blocking] Added `extends Record<string,unknown>` to ScoreRow interface**
- **Found during:** Task 1 (TypeScript verification — TS2344)
- **Issue:** drizzle-orm postgres-js `db.execute<T>` has a constraint `T extends Record<string, unknown>`. Plain interface without index signature caused TS2344.
- **Fix:** Changed `interface ScoreRow { ... }` to `interface ScoreRow extends Record<string, unknown> { ... }`
- **Files modified:** src/lib/rfm/engine.ts
- **Verification:** `tsc --noEmit` passes with zero errors in src/
- **Committed in:** 6b8dfb8 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking TypeScript type errors discovered during verification)
**Impact on plan:** Both fixes required for TypeScript strict compliance. No scope creep.

## Issues Encountered

- `npx tsc` binary was broken (relative path `../lib/tsc.js` in the shim resolved incorrectly). Worked around by invoking `node node_modules/typescript/lib/tsc.js` directly. All subsequent TypeScript checks used this invocation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `recalculateAllRfmScores(shopId)` ready to be called by Inngest cron and order webhook handlers in 03-02
- `mapRfmToSegment` available for use anywhere segment mapping is needed (webhooks, UI display)
- `updateCustomerCountersFromOrders(shopId, customerId)` ready to be called by order event handlers
- Zero `parseFloat` in RFM or query code; all money via Decimal; all RFM scoring in PostgreSQL

---
*Phase: 03-rfm-engine*
*Completed: 2026-02-19*
