---
phase: 02-shopify-integration
plan: "04"
subsystem: database
tags: [drizzle, inngest, postgres, webhooks, sync]

# Dependency graph
requires:
  - phase: 02-shopify-integration/02-02
    provides: processShopifyWebhook, upsertCustomer, upsertOrder, syncLogs schema, webhookDeliveries schema

provides:
  - True last-write-wins via or(isNull, lte) timestamp guards in upsertCustomer and upsertOrder setWhere
  - updateWebhookDeliveryStatus: plain UPDATE function for dead-letter status changes (not insert-or-ignore)
  - processShopifyWebhookFailure: Inngest onFailure handler that marks exhausted webhooks as dead_letter
  - bulk_operations/finish failure path: queries syncLog by bulkOperationId and calls updateSyncLog(status=failed)

affects:
  - 03-rfm-engine (uses upsertCustomer with correct timestamp semantics)
  - 04-email-automation (relies on webhookDeliveries dead_letter for observability)
  - any future monitoring/alerting on sync state

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Last-write-wins via or(isNull(col.shopifyUpdatedAt), lte(col.shopifyUpdatedAt, incoming)): prevents old webhook replays overwriting newer data"
    - "Inngest onFailure handler pattern: separate function listening on inngest/function.failed, guarded by function_id check, retries=0"
    - "updateWebhookDeliveryStatus vs recordWebhookDelivery: use update (not insert-or-ignore) when row already exists as processing"

key-files:
  created: []
  modified:
    - src/lib/db/queries.ts
    - src/inngest/functions.ts

key-decisions:
  - "Move dynamic imports to top of bulk_operations/finish case so both the failure and success branches share the same db/syncLogs/eq/and bindings without duplicate declarations"
  - "updateWebhookDeliveryStatus uses plain .update() not .insert().onConflictDoNothing() — the processing row already exists when retries are exhausted"

patterns-established:
  - "setWhere for last-write-wins: or(isNull(table.shopifyUpdatedAt), lte(table.shopifyUpdatedAt, incoming)) — use this pattern for any future Shopify entity upserts"
  - "Inngest dead-letter: always use a separate onFailure function with retries=0, never rely on implicit Inngest behavior"

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 2 Plan 04: Gap Closure — Sync Failure Path and Last-Write-Wins Fixes Summary

**Real last-write-wins timestamp guards in upsertCustomer/upsertOrder and a working bulk sync failure path that marks syncLogs as failed instead of leaving them permanently running**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T10:51:09Z
- **Completed:** 2026-02-19T10:54:07Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Fixed `upsertCustomer` and `upsertOrder` setWhere to use `or(isNull, lte)` timestamp comparison — previously always-true `eq(shopId) AND eq(shopifyId)` let older webhook replays silently overwrite newer stored data
- Fixed `bulk_operations/finish` failure path to query syncLog by `bulkOperationId` and call `updateSyncLog(status='failed')` — previously broke silently, leaving syncLogs permanently in 'running'
- Added `processShopifyWebhookFailure` Inngest function (guarded by `function_id` check, `retries: 0`) calling `updateWebhookDeliveryStatus` to mark dead-letter webhooks — previously no handler existed and the comment referenced a "handler below" that didn't exist
- Exported `updateWebhookDeliveryStatus` from queries.ts — plain `.update()` ensures the 'processing' row is correctly flipped to 'dead_letter' (unlike `recordWebhookDelivery` which uses `onConflictDoNothing` and silently skips)

## Task Commits

Each task was committed atomically:

1. **Task 2: Fix last-write-wins timestamp comparison in upsertCustomer and upsertOrder** - `e95d8d1` (fix)
2. **Task 1: Fix bulk_operations/finish failure path and add onFailure dead-letter handler** - `f55e186` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/db/queries.ts` — Added `lte`, `or`, `isNull` imports; corrected setWhere in upsertCustomer and upsertOrder; added `updateWebhookDeliveryStatus` export
- `src/inngest/functions.ts` — Moved dynamic imports before status check; fixed failure path to call updateSyncLog; updated re-throw comment; added `processShopifyWebhookFailure` function and updated functions array (2 → 3)

## Decisions Made

- Move dynamic imports (`db`, `syncLogs`, `eq`, `and`) to the top of the `bulk_operations/finish` case block before the status check, so both the failure branch and success branch share the same bindings without duplicate declarations or aliased names.
- `updateWebhookDeliveryStatus` uses plain `.update()` not `.insert().onConflictDoNothing()` — the webhook delivery row already exists as 'processing' when all retries are exhausted, so a plain UPDATE is required to flip it to 'dead_letter'.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The `npx tsc` binary had a broken symlink (`Cannot find module '../lib/tsc.js'`). Used `node node_modules/typescript/bin/tsc` directly. TypeScript itself had zero errors in source files; the only pre-existing errors were in `.next/types/app/page.ts` (auto-generated Next.js files, not our code).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gap 1 (blocker) from Phase 2 verification is fully resolved: syncLog failure path works correctly and dead-letter tracking is live
- Gap 2 (warning) from Phase 2 verification is fully resolved: last-write-wins semantics are real, not just documented
- Phase 3 (RFM Engine) can now rely on correct customer/order upsert semantics
- All Phase 2 gap-closure plans (02-04, 02-05) are complete

## Self-Check: PASSED

- FOUND: src/lib/db/queries.ts
- FOUND: src/inngest/functions.ts
- FOUND: .planning/phases/02-shopify-integration/02-04-SUMMARY.md
- FOUND commit: e95d8d1 (fix last-write-wins)
- FOUND commit: f55e186 (fix bulk failure path + dead-letter handler)

---
*Phase: 02-shopify-integration*
*Completed: 2026-02-19*
