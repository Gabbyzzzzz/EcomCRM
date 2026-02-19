---
phase: 02-shopify-integration
plan: "01"
subsystem: database, api
tags: [shopify, graphql, drizzle, postgres, rate-limiting, throttling, webhooks, sync]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Drizzle schema base tables (customers, orders, automations, message_logs), env validation (SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN)

provides:
  - Shopify Admin GraphQL client with cost-based throttling (src/lib/shopify/client.ts)
  - Strict TypeScript types for Shopify API responses (src/lib/shopify/types.ts)
  - sync_logs table for tracking full/incremental sync runs with cursor and bulkOperationId
  - webhook_deliveries table with unique (shop_id, webhook_id) for idempotency dedup
  - customers.deletedAt and customers.shopifyUpdatedAt columns for soft-delete and last-write-wins
  - orders.isHistorical, orders.shopifyCreatedAt, orders.shopifyUpdatedAt columns for bulk sync tracking
  - Migration SQL: drizzle/0001_thankful_grey_gargoyle.sql

affects: [02-02-bulk-sync, 02-03-webhooks, 02-04-incremental-sync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Cost-based proactive throttling: check currentlyAvailable < requestedQueryCost*2 after each response, sleep to refill
    - Exponential backoff on throttle errors: 1s, 2s, 4s, max 3 retries
    - shopifyGraphQL<T> is the low-level function; shopifyClient.query<T>/rawQuery<T> are convenience wrappers
    - syncStatusEnum exported at module top level (drizzle-kit requirement)

key-files:
  created:
    - src/lib/shopify/client.ts
    - src/lib/shopify/types.ts
    - drizzle/0001_thankful_grey_gargoyle.sql
  modified:
    - src/lib/db/schema.ts

key-decisions:
  - "shopifyGraphQL uses cost-based proactive throttling: sleeps when currentlyAvailable < requestedQueryCost*2 to prevent 429s before they occur"
  - "shopifyClient.rawQuery<T> exposes full GraphQLResponse (including extensions.cost) for callers that need cost metadata (bulk sync pagination)"
  - "syncLogs.cursor stores checkpoint for resume-on-failure in bulk operations"
  - "webhookDeliveries unique index on (shop_id, webhook_id) enforces idempotency at DB level"
  - "orders.shopifyCreatedAt distinct from orders.createdAt (our DB insert time) — Shopify's original timestamp"

patterns-established:
  - "All Shopify API calls go through shopifyGraphQL or shopifyClient — never raw fetch"
  - "Import env from @/lib/env, never process.env directly"
  - "All new schema tables/enums exported with export const at module top level"

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 2 Plan 01: Shopify GraphQL Client and Schema Extensions Summary

**Authenticated Shopify Admin GraphQL client with cost-based proactive throttling, plus sync_logs/webhook_deliveries tables and is_historical/shopifyUpdatedAt/deletedAt columns for the full sync pipeline**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-19T06:26:56Z
- **Completed:** 2026-02-19T06:29:14Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended DB schema with syncStatusEnum, syncLogs table, and webhookDeliveries table (unique idempotency index)
- Added customers.deletedAt, customers.shopifyUpdatedAt and orders.isHistorical, orders.shopifyCreatedAt, orders.shopifyUpdatedAt columns
- Generated migration SQL (0001_thankful_grey_gargoyle.sql) with all ALTER TABLE and CREATE TABLE statements verified
- Created src/lib/shopify/types.ts with strict TypeScript types: GraphQLResponse<T>, ShopifyCustomer, ShopifyOrder, ShopifyBulkOperation, BulkOperationWebhookPayload
- Created src/lib/shopify/client.ts with shopifyGraphQL<T> function featuring cost-based proactive throttling and exponential backoff retry

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend DB schema with sync tracking tables and columns** - `ff49df1` (feat)
2. **Task 2: Shopify GraphQL client with cost-based rate limiting** - `6287288` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/db/schema.ts` - Added syncStatusEnum, new columns on customers/orders, syncLogs and webhookDeliveries tables
- `drizzle/0001_thankful_grey_gargoyle.sql` - Migration SQL: CREATE TYPE sync_status, CREATE TABLE sync_logs/webhook_deliveries, ALTER TABLE customers/orders
- `src/lib/shopify/types.ts` - GraphQLCostExtension, GraphQLResponse<T>, ShopifyCustomer, ShopifyOrder, ShopifyBulkOperation, BulkOperationWebhookPayload
- `src/lib/shopify/client.ts` - shopifyGraphQL<T> with cost throttling + shopifyClient.query/rawQuery convenience wrappers

## Decisions Made
- Cost-based proactive throttling: sleep when currentlyAvailable < requestedQueryCost*2, so budget never actually runs out
- shopifyClient.rawQuery<T> exposes full response including extensions.cost for callers (bulk sync) that need cost metadata
- syncLogs.cursor stores resume checkpoint for bulk operations that fail mid-stream
- webhookDeliveries unique DB index on (shop_id, webhook_id) for idempotency at storage level

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required beyond what was established in Phase 1.

## Next Phase Readiness
- 02-02 (bulk sync): shopifyClient, all types, and syncLogs/webhookDeliveries tables are ready
- 02-03 (webhooks): shopifyClient and webhookDeliveries table ready for HMAC verification and dedup
- Migration SQL ready to apply to production DB

---
*Phase: 02-shopify-integration*
*Completed: 2026-02-19*

## Self-Check: PASSED

- src/lib/shopify/client.ts: FOUND
- src/lib/shopify/types.ts: FOUND
- src/lib/db/schema.ts: FOUND
- drizzle/0001_thankful_grey_gargoyle.sql: FOUND
- 02-01-SUMMARY.md: FOUND
- Commit ff49df1: FOUND
- Commit 6287288: FOUND
