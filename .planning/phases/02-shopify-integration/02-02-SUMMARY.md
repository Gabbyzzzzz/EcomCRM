---
phase: 02-shopify-integration
plan: "02"
subsystem: api, database, background-jobs
tags: [shopify, webhooks, sync, bulk-operations, inngest, hmac, idempotency, decimal, drizzle, upsert]

# Dependency graph
requires:
  - phase: 02-shopify-integration
    plan: "01"
    provides: shopifyClient (cost throttling), ShopifyCustomer/Order types, syncLogs/webhookDeliveries tables

provides:
  - Full Shopify sync pipeline: bulkOperationRunQuery start + async JSONL processing via webhook completion
  - Checkpoint-based resume: failed syncs with cursor resume from last batch boundary
  - HMAC-verified webhook ingestion endpoint with idempotency (X-Shopify-Webhook-Id)
  - Incremental sync: paginated updated_at-filtered queries, runs every 6h via Inngest cron
  - Inngest processShopifyWebhook function handling all topics including bulk_operations/finish inline
  - DB upserts with selective merge: Shopify fields overwritten, CRM fields (rfm, segment) preserved
  - Unique composite indexes on (shopId, shopifyId) for customers and orders

affects: [03-rfm-engine, 04-email-automation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Raw body read (request.text()) BEFORE any JSON.parse in webhook handler
    - timingSafeEqual for HMAC comparison (prevents timing attacks)
    - onConflictDoUpdate with selective set — CRM fields excluded from set map
    - Checkpoint cursor: syncLog.cursor updated every 100 records for resume-on-failure
    - bulk_operations/finish handled inside processShopifyWebhook switch-case (no dead separate function)
    - Decimal for all money arithmetic (never parseFloat) — even avgOrderValue intermediate calculation

key-files:
  created:
    - src/lib/db/queries.ts
    - src/lib/shopify/queries.ts
    - src/lib/shopify/sync.ts
    - src/lib/shopify/webhooks.ts
    - src/app/api/webhooks/shopify/route.ts
    - src/app/api/sync/route.ts
    - drizzle/0002_giant_metal_master.sql
  modified:
    - src/lib/db/schema.ts (added uniqueIndex on customers and orders)
    - src/inngest/functions.ts (replaced empty array with processShopifyWebhook + scheduledSync)

key-decisions:
  - "bulk_operations/finish handled inline in processShopifyWebhook switch-case — no separate dead-code function"
  - "Checkpoint-based resume: syncLog.cursor stores last processed GID, written every 100 records"
  - "upsertCustomer.onConflictDoUpdate.set excludes rfmR/rfmF/rfmM/segment/lifecycleStage — CRM field preservation"
  - "Decimal used for all money arithmetic including intermediate avgOrderValue computation in Inngest handler"
  - "shopId derived from new URL(env.SHOPIFY_STORE_URL).hostname — consistent across webhook route and sync API"

patterns-established:
  - "All money computation: new Decimal(amount).toString() or .div().toFixed(4) — never parseFloat"
  - "Webhook idempotency: check before process, record before dispatch (prevents race condition)"
  - "HMAC verify on raw string body before JSON.parse — SHOP-04 compliance pattern"

# Metrics
duration: 6min
completed: 2026-02-19
---

# Phase 2 Plan 02: Shopify Sync Pipeline and Webhook Infrastructure Summary

**Full Shopify data pipeline: bulk operation sync with checkpoint resume, HMAC-verified webhook ingestion with idempotency, incremental sync with pagination, and Inngest function wiring for all event types**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-19T06:31:30Z
- **Completed:** 2026-02-19T06:37:38Z
- **Tasks:** 2
- **Files created:** 7, Modified: 2

## Accomplishments

- Implemented `src/lib/db/queries.ts` with 9 exported functions: `upsertCustomer` (selective merge, Decimal money, last-write-wins), `upsertOrder` (isHistorical flag, same pattern), `softDeleteCustomer`, `createSyncLog`, `updateSyncLog`, `getLatestSyncLog`, `getFailedSyncWithCursor`, `checkWebhookIdempotency`, `recordWebhookDelivery`
- Added unique composite indexes (`customers_shop_shopify_unique`, `orders_shop_shopify_unique`) to schema.ts and generated migration `0002_giant_metal_master.sql`
- Created `src/lib/shopify/queries.ts` with 5 exported GraphQL strings: `BULK_CUSTOMERS_QUERY`, `BULK_ORDERS_QUERY`, `BULK_OPERATION_STATUS_QUERY`, `SINGLE_CUSTOMER_QUERY`, `SINGLE_ORDER_QUERY`
- Implemented `src/lib/shopify/sync.ts`: `startFullSync` with checkpoint-based resume detection, `processFullSyncResults` with streaming JSONL parse and 100-record checkpoint saves, `startIncrementalSync` with paginated `updated_at` filter, and `fetchAndUpsertCustomer`/`fetchAndUpsertOrder` helpers
- Created `src/lib/shopify/webhooks.ts`: `verifyShopifyWebhook` (HMAC-SHA256 + `crypto.timingSafeEqual`), `parseWebhookTopic`, `extractWebhookId`
- Created `src/app/api/webhooks/shopify/route.ts`: raw body read first, HMAC verify, idempotency check, record delivery, dispatch to Inngest — returns 200 immediately
- Created `src/app/api/sync/route.ts`: POST triggers full/incremental sync with zod validation, GET returns latest sync log
- Updated `src/inngest/functions.ts`: `processShopifyWebhook` handles all 6 topics (orders/create, orders/updated, customers/create, customers/update, customers/delete, bulk_operations/finish) inline; `scheduledSync` cron every 6 hours; exactly 2 functions in array

## Task Commits

1. **Task 1: DB query functions and GraphQL query strings** - `b09ee9c` (feat)
2. **Task 2: Bulk sync, webhook endpoint, incremental handlers, and Inngest wiring** - `9f2b30a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/db/queries.ts` - 9 exported functions, all money via Decimal, selective upsert merge
- `src/lib/db/schema.ts` - Added uniqueIndex on (shopId, shopifyId) for customers and orders
- `src/lib/shopify/queries.ts` - 5 GraphQL query constants (bulk mutations + single-resource queries)
- `src/lib/shopify/sync.ts` - Full sync with checkpoint resume, JSONL streaming, incremental sync with pagination
- `src/lib/shopify/webhooks.ts` - HMAC verify (timingSafeEqual), topic/id header extraction
- `src/app/api/webhooks/shopify/route.ts` - Webhook ingestion: HMAC verify → idempotency → record → dispatch
- `src/app/api/sync/route.ts` - Sync trigger (POST) and status (GET)
- `src/inngest/functions.ts` - processShopifyWebhook + scheduledSync (exactly 2 functions)
- `drizzle/0002_giant_metal_master.sql` - CREATE UNIQUE INDEX for customers and orders

## Decisions Made

- `bulk_operations/finish` handled inline in `processShopifyWebhook` switch-case — eliminates dead code that a separate `processFullSyncCompletion` function would have been (no other event emits `shopify/bulk-operation.completed`)
- Checkpoint-based resume: `syncLog.cursor` stores last processed Shopify GID, written every 100 records; `startFullSync` checks `getFailedSyncWithCursor` before starting fresh
- `upsertCustomer.onConflictDoUpdate.set` intentionally excludes `rfmR`, `rfmF`, `rfmM`, `segment`, `lifecycleStage` — these are CRM-owned and should never be overwritten by a Shopify sync
- `Decimal` used for all money arithmetic including intermediate `avgOrderValue` computation in Inngest handler (not just at storage boundary)
- `shopId` derived from `new URL(env.SHOPIFY_STORE_URL).hostname` in both webhook route and sync API — consistent single-tenant identifier

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed parseFloat in Inngest avgOrderValue computation**
- **Found during:** Task 2 (verification grep)
- **Issue:** Inngest webhook handler for `customers/create`/`customers/update` used `parseFloat(totalSpent) / orderCount` for `avgOrderValue` before passing to `upsertCustomer` — violated SHOP-07 even though `upsertCustomer` internally uses `Decimal` for `totalSpent`/`avgOrderValue` storage
- **Fix:** Replaced `parseFloat(totalSpent) / orderCount` with `new Decimal(totalSpent).div(orderCount).toFixed(4)` and added `Decimal` import to functions.ts
- **Files modified:** `src/inngest/functions.ts`
- **Commit:** `9f2b30a`

## Issues Encountered

None beyond the auto-fixed deviation above.

## User Setup Required

None — all env vars already validated. Apply migration `drizzle/0002_giant_metal_master.sql` to production DB before first sync.

## Next Phase Readiness

- 03-rfm-engine: `upsertCustomer` selective merge preserves rfmR/rfmF/rfmM/segment ready for RFM writes
- 04-email-automation: Inngest event system ready; `processShopifyWebhook` can be extended with trigger evaluation
- Full sync pipeline ready to test once Shopify Custom App credentials are configured

---
*Phase: 02-shopify-integration*
*Completed: 2026-02-19*

## Self-Check: PASSED

- src/lib/db/queries.ts: FOUND
- src/lib/shopify/queries.ts: FOUND
- src/lib/shopify/sync.ts: FOUND
- src/lib/shopify/webhooks.ts: FOUND
- src/app/api/webhooks/shopify/route.ts: FOUND
- src/app/api/sync/route.ts: FOUND
- drizzle/0002_giant_metal_master.sql: FOUND
- 02-02-SUMMARY.md: FOUND
- Commit b09ee9c: FOUND
- Commit 9f2b30a: FOUND
