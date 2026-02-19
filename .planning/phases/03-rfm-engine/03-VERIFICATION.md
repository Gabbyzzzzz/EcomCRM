---
phase: 03-rfm-engine
verified: 2026-02-19T12:26:43Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 3: RFM Engine Verification Report

**Phase Goal:** Every customer in the database has an RFM score and a named segment that updates automatically
**Verified:** 2026-02-19T12:26:43Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `recalculateAllRfmScores` runs NTILE(5) in PostgreSQL — no customer rows loaded into Node.js for sorting | VERIFIED | Lines 98-108 of engine.ts: `db.execute<ScoreRow>(sql\`SELECT … NTILE(5) OVER … FROM ${customers}\`)` — window functions execute entirely in DB |
| 2 | Every customer row receives rfm_r, rfm_f, rfm_m (1-5) and a segment label after recalculation | VERIFIED | Lines 128-156 of engine.ts: batch UPDATE via unnest() array pattern writes rfm_r, rfm_f, rfm_m, segment to all customers in chunks of 100 |
| 3 | `mapRfmToSegment` maps all 125 (R,F,M) combinations to exactly one of 7 segments | VERIFIED | Programmatic test: all 125 combinations covered; all 7 segments (champion:8, loyal:19, new:10, potential:38, at_risk:40, hibernating:8, lost:2) produced |
| 4 | `updateCustomerCountersFromOrders` recalculates order_count, total_spent, avg_order_value, first_order_at, last_order_at using SQL aggregation + Decimal | VERIFIED | Lines 337-377 of queries.ts: `db.execute<AggRow>(sql\`SELECT COUNT(*), SUM(total_price::numeric), MIN(…), MAX(…)\`)` + `new Decimal(…).div(orderCount)` |
| 5 | A daily Inngest cron calls `recalculateAllRfmScores` at 2 AM UTC without manual intervention | VERIFIED | Lines 304-340 of functions.ts: `dailyRfmRecalculation` created with `{ cron: '0 2 * * *' }` + `step.run('recalculate-rfm-scores', async () => recalculateAllRfmScores(shopId))` |
| 6 | When an orders/create or orders/updated webhook fires, the affected customer's counters are recalculated | VERIFIED | Lines 96-111 of functions.ts: after `upsertOrder()`, resolves `order.customer.id` → internal UUID → calls `updateCustomerCountersFromOrders(shopId, customerRow.id)` |
| 7 | When a customer's segment changes, an `rfm/segment.changed` event is emitted with customerId, oldSegment, newSegment | VERIFIED | Lines 319-334 of functions.ts: `inngest.send(segmentChanges.map(change => ({ name: 'rfm/segment.changed', data: { shopId, customerId, oldSegment, newSegment } })))` |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/rfm/engine.ts` | RFM scoring engine with PostgreSQL NTILE(5) and segment mapping | VERIFIED | 169 lines; exports `recalculateAllRfmScores`, `mapRfmToSegment`, `SEGMENT_MAP`, `CustomerSegment`, `SegmentChange`; NTILE(5) in SQL template at lines 101-103 |
| `src/lib/db/queries.ts` | `updateCustomerCountersFromOrders` query function | VERIFIED | Lines 326-377; exports `updateCustomerCountersFromOrders`; SQL COUNT/SUM/MIN/MAX aggregation; Decimal for avgOrderValue; no parseFloat |
| `src/inngest/functions.ts` | `dailyRfmRecalculation` cron + order-event counter updates + segment_change event emission | VERIFIED | Lines 304-350; registered in exported `functions` array (4 functions total) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/rfm/engine.ts` | `src/lib/db/index.ts` | `import { db } from '@/lib/db'` | WIRED | Line 1 of engine.ts; `db.execute(sql\`…\`)` used at lines 98 and 140 |
| `src/lib/rfm/engine.ts` | `src/lib/db/schema.ts` | `import { customers } from '@/lib/db/schema'` | WIRED | Line 3 of engine.ts; `customers` table used in SELECT (line 105) and UPDATE (line 142) |
| `src/inngest/functions.ts` | `src/lib/rfm/engine.ts` | `import { recalculateAllRfmScores } from '@/lib/rfm/engine'` | WIRED | Line 19 of functions.ts; called at line 315 inside `step.run()` |
| `src/inngest/functions.ts` | `src/lib/db/queries.ts` | `import { updateCustomerCountersFromOrders } from '@/lib/db/queries'` | WIRED | Line 11 of functions.ts; called at line 109 in orders/create+updated case |
| `src/inngest/functions.ts` | Inngest event bus | `inngest.send({ name: 'rfm/segment.changed' })` | WIRED | Lines 322-333 of functions.ts; batch send with typed `as const` event name |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| RFM-04: Per-order customer counter recalculation | SATISFIED | `updateCustomerCountersFromOrders` called in orders/create + orders/updated webhook handler |
| RFM-05: Daily full quintile recalculation via cron | SATISFIED | `dailyRfmRecalculation` cron at `0 2 * * *` |
| Segment auto-update | SATISFIED | Daily cron updates all `rfm_r`, `rfm_f`, `rfm_m`, `segment` columns via batch UPDATE |
| Segment change events | SATISFIED | `rfm/segment.changed` events emitted per changed customer for Phase 5 automation engine |
| No parseFloat in money handling | SATISFIED | Zero `parseFloat` calls in engine.ts, relevant queries.ts functions, or functions.ts |
| NTILE(5) in PostgreSQL, not JS | SATISFIED | Window functions run in DB; only `Number()` conversion used for NTILE integer results in application |

### Anti-Patterns Found

None — no TODOs, FIXMEs, placeholder returns, empty implementations, or parseFloat calls found in phase 3 files.

### Human Verification Required

None — all goal requirements are verifiable programmatically through code inspection.

### Additional Notes

1. **TypeScript compilation:** `tsc --noEmit` passes with zero errors in src/ (the two `.next/types` errors are generated Next.js artifacts, pre-existing and not part of this phase).

2. **7-segment coverage:** Programmatic test of all 125 R/F/M combinations confirms every combination maps to exactly one of the 7 valid segment values. The `lost` segment (only 2 combinations: R=1,F=1,M=1) serves as the correct catch-all default.

3. **Batch UPDATE pattern:** The UPDATE in `recalculateAllRfmScores` uses `unnest(ARRAY[...]::uuid[])` — this is a single SQL statement per 100-customer chunk, not N individual queries. The use of `sql.raw()` for these arrays is safe because values originate from the DB's own SELECT result (internal UUIDs and NTILE integers), never from user input.

4. **Step checkpointing:** `dailyRfmRecalculation` uses two separate `step.run()` calls — one for scoring, one for event emission. This means a retry after scoring failure will not re-run the expensive NTILE query.

5. **`ShopifyOrder.customer` type:** The `customer: { id: string } | null` field exists in `src/lib/shopify/types.ts` (line 59-61), confirming the webhook counter-update lookup is properly typed.

---

_Verified: 2026-02-19T12:26:43Z_
_Verifier: Claude (gsd-verifier)_
