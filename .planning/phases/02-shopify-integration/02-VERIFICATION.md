---
phase: 02-shopify-integration
verified: 2026-02-19T10:30:00Z
status: gaps_found
score: 3/5 must-haves verified
re_verification: false
gaps:
  - truth: "Creating an order in Shopify triggers the webhook endpoint within seconds; the endpoint returns 200 only after HMAC verification passes and upserts the record idempotently"
    status: partial
    reason: "HMAC verification, idempotency check, and 200-return are all correctly implemented. However, the bulk_operations/finish failure path in Inngest does NOT update the syncLog status to 'failed' — it logs a warning and breaks without calling updateSyncLog. The onFailure dead-letter handler referenced in a comment does not exist."
    artifacts:
      - path: "src/inngest/functions.ts"
        issue: "Lines 132-138: when bulk_operations/finish arrives with a non-completed status, the code logs a warning and breaks — the syncLog is never marked 'failed'. The comment on line 193 says 'We update status to dead_letter in the onFailure handler below' but no onFailure handler exists anywhere in the file."
    missing:
      - "In the bulk_operations/finish case, when bulkPayload.status !== 'completed', query the syncLog by bulkOperationId and call updateSyncLog with status='failed' and errorMessage"
      - "Add actual Inngest onFailure handler OR add a catch block that updates webhookDeliveries status to 'dead_letter' after all retries are exhausted"

  - truth: "Sending the same webhook payload twice (duplicate X-Shopify-Webhook-Id) results in only one database record — no duplicate processing"
    status: partial
    reason: "The idempotency check (checkWebhookIdempotency) and recordWebhookDelivery are wired correctly. However, the last-write-wins mechanism claimed for upsertCustomer and upsertOrder does NOT actually compare timestamps. The setWhere clause only checks eq(shopId) AND eq(shopifyId), which always evaluates to true when there is a conflict — meaning old webhook replays CAN overwrite more recent data."
    artifacts:
      - path: "src/lib/db/queries.ts"
        issue: "Lines 88-93 and 162-167: the onConflictDoUpdate.setWhere condition only filters on shop_id=? AND shopify_id=? — these always match on conflict. True last-write-wins requires comparing the incoming shopifyUpdatedAt against the stored value (e.g., lte(customers.shopifyUpdatedAt, incomingDate) or using sql`excluded.shopify_updated_at > shopify_updated_at`). The comment on line 86-87 says 'only apply update if incoming shopifyUpdatedAt is newer' but the condition does not enforce this."
    missing:
      - "In upsertCustomer onConflictDoUpdate.setWhere: replace the eq() conditions with a timestamp comparison — e.g., or(isNull(customers.shopifyUpdatedAt), lte(customers.shopifyUpdatedAt, data.shopifyUpdatedAt))"
      - "Same fix in upsertOrder onConflictDoUpdate.setWhere"

  - truth: "GraphQL requests back off automatically when the Shopify API cost budget is low — no 429 errors crash the sync"
    status: partial
    reason: "Cost-based throttling is implemented correctly. However, the env key changed from the plan-specified SHOPIFY_ACCESS_TOKEN to SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (OAuth client credentials grant). This is a deviation from the plan's must_have key_link which specifies 'imports env for SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN'. The actual code uses client_id/client_secret for a token fetch flow that the original plan did not specify. This is a functional improvement but the env var SHOPIFY_ACCESS_TOKEN referenced in CLAUDE.md, REQUIREMENTS.md and multiple planning docs is no longer in env.ts — creating a documentation mismatch."
    artifacts:
      - path: "src/lib/shopify/client.ts"
        issue: "Minor — the plan key_link specified 'imports env for SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN' but the actual client uses SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET via OAuth client credentials. The throttling logic itself is correct and substantive."
      - path: "src/lib/env.ts"
        issue: "SHOPIFY_ACCESS_TOKEN is no longer in the schema (replaced by SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET), but CLAUDE.md, REQUIREMENTS.md and .planning docs still reference SHOPIFY_ACCESS_TOKEN. Documentation mismatch only — code works."
    missing:
      - "Update CLAUDE.md, REQUIREMENTS.md and .planning/codebase/ docs to reflect SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET instead of SHOPIFY_ACCESS_TOKEN"
      - "Not a code blocker — throttling behavior is correctly implemented"
human_verification:
  - test: "Start the app with dev server, visit the dashboard, confirm nav shows stale/error state (red dot), then click Sync Now and verify a POST request reaches /api/sync"
    expected: "Nav indicator shows red AlertCircle with red dot badge. Clicking Sync Now sends POST /api/sync. Without real Shopify credentials the sync fails gracefully."
    why_human: "Visual state cannot be verified programmatically"
  - test: "Send a POST to /api/webhooks/shopify without X-Shopify-Hmac-Sha256 header"
    expected: "Response is 401 Unauthorized"
    why_human: "Needs an actual HTTP request to verify"
  - test: "On /settings/sync, verify the Advanced toggle reveals Force Full Sync with a confirmation dialog"
    expected: "Collapsible shows only when Advanced is clicked. Clicking Force Full Sync opens an AlertDialog. Confirming sends POST /api/sync with force=true."
    why_human: "UI interaction flow cannot be verified programmatically"
---

# Phase 2: Shopify Integration Verification Report

**Phase Goal:** Real Shopify customer and order data is in the database, kept current via webhooks
**Verified:** 2026-02-19T10:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Full sync loads all customers and orders with NUMERIC money and `is_historical` flag | VERIFIED | `processFullSyncResults` uses `Decimal` for all money, sets `isHistorical = createdAt < syncStartedAt`. `orders.isHistorical` column exists in schema and migration 0001. |
| 2 | Webhook returns 200 only after HMAC verification passes and upserts idempotently | PARTIAL | HMAC verify and idempotency check are correct. Inngest `bulk_operations/finish` failure path does NOT update syncLog — it breaks silently. Dead-letter handler referenced in a comment does not exist. |
| 3 | Duplicate webhook with same `X-Shopify-Webhook-Id` results in only one DB record | PARTIAL | Route-level idempotency (checkWebhookIdempotency) is correct. But upsert `setWhere` does NOT enforce last-write-wins — old replays can overwrite newer data because the timestamp comparison is missing. |
| 4 | UI shows "Last synced X ago" and alerts when stale (>24h) | VERIFIED | `formatRelativeTime` renders relative time. `isStale = msSinceCompletion > STALE_THRESHOLD_MS (24h)`. Red dot badge + AlertCircle rendered when `isStale`. All wired through `/api/sync/status` → `SyncIndicator`. |
| 5 | GraphQL backs off on low budget — no 429 crashes | PARTIAL | Throttling logic is substantive and correct. However, env key changed from plan-specified `SHOPIFY_ACCESS_TOKEN` to `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET`. Not a runtime blocker but creates documentation mismatch. Marking partial due to spec deviation in key_link. |

**Score:** 3/5 truths fully verified (2 have confirmed gaps, 0 totally missing)

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/shopify/client.ts` | VERIFIED | 225 lines. Exports `shopifyGraphQL` and `shopifyClient`. Cost-based throttling on lines 175-188. Exponential backoff retries. Uses OAuth client credentials (deviation from plan but functional). |
| `src/lib/shopify/types.ts` | VERIFIED | All 6 types exported: `GraphQLCostExtension`, `GraphQLResponse<T>`, `ShopifyCustomer`, `ShopifyOrder`, `ShopifyBulkOperation`, `BulkOperationWebhookPayload`. Strict TypeScript, no `any`. |
| `src/lib/db/schema.ts` | VERIFIED | `syncLogs`, `webhookDeliveries` tables present. `orders.isHistorical`, `orders.shopifyCreatedAt`, `orders.shopifyUpdatedAt`, `customers.deletedAt`, `customers.shopifyUpdatedAt` all present. Unique composite indexes on both customers and orders. |
| `drizzle/0001_thankful_grey_gargoyle.sql` | VERIFIED | Creates `sync_status` enum, `sync_logs`, `webhook_deliveries` tables. ALTERs `customers` (deleted_at, shopify_updated_at) and `orders` (is_historical, shopify_created_at, shopify_updated_at). Unique index on webhook_deliveries. |
| `drizzle/0002_giant_metal_master.sql` | VERIFIED | Creates `customers_shop_shopify_unique` and `orders_shop_shopify_unique` unique composite indexes. |
| `src/lib/db/queries.ts` | PARTIAL | All 9 functions exported and substantive. `Decimal` used for money. CRM fields excluded from `onConflictDoUpdate.set`. **GAP: `setWhere` does not compare timestamps** — only checks shop_id/shopify_id, so last-write-wins claim in comments is false. |
| `src/lib/shopify/queries.ts` | VERIFIED | 191 lines. All 5 constants exported: `BULK_CUSTOMERS_QUERY`, `BULK_ORDERS_QUERY`, `BULK_OPERATION_STATUS_QUERY`, `SINGLE_CUSTOMER_QUERY`, `SINGLE_ORDER_QUERY`. |
| `src/lib/shopify/sync.ts` | VERIFIED | `startFullSync` with checkpoint resume, `processFullSyncResults` with streaming JSONL + 100-record checkpoint saves, `startIncrementalSync` with pagination. `Decimal` for all money. `isHistorical` set by cutover timestamp. |
| `src/lib/shopify/webhooks.ts` | VERIFIED | `verifyShopifyWebhook` uses `crypto.timingSafeEqual`. Raw body required by caller. `parseWebhookTopic` and `extractWebhookId` present. |
| `src/app/api/webhooks/shopify/route.ts` | VERIFIED | Raw body read first (`request.text()`). HMAC verified before JSON parse. Idempotency checked. Delivery recorded before dispatch. `inngest.send` called. Returns 200 immediately. |
| `src/app/api/sync/route.ts` | VERIFIED | POST triggers full (force=true) or incremental. Zod validation. GET returns latest sync log. |
| `src/inngest/functions.ts` | PARTIAL | `processShopifyWebhook` and `scheduledSync` exported. Exactly 2 functions in array. All 6 webhook topics handled. **GAP: `bulk_operations/finish` failure path (non-completed status) does NOT call `updateSyncLog`** — syncLog is never marked failed. Dead-letter `onFailure` handler referenced in comment does not exist anywhere in file. |
| `src/app/api/sync/status/route.ts` | VERIFIED | Returns `{ status, lastSyncAt, isStale, customersCount, ordersCount, deadLetterCount }`. 24h stale threshold. `?history=true` support. Dead letter count from `webhookDeliveries WHERE status='dead_letter'`. |
| `src/components/sync-indicator.tsx` | VERIFIED | 313 lines. Three states rendered (idle/running/stale). Auto-sync on `lastSyncAt === null`. Completion toast with actual counts. Adaptive polling (2s/10s). `hasAutoTriggeredRef` prevents duplicate triggers. |
| `src/components/sync-status-detail.tsx` | VERIFIED | 272 lines. Full sync history table. Dead letter count alert. Live progress. |
| `src/components/sync-actions.tsx` | VERIFIED | Sync Now button. Force Full Sync behind Collapsible (Advanced toggle) with AlertDialog confirmation. |
| `src/app/(dashboard)/layout.tsx` | VERIFIED | `SyncIndicator` imported and rendered in top nav. `Toaster` provider present. |
| `src/app/settings/sync/page.tsx` | VERIFIED | Renders `SyncStatusDetail` and `SyncActions`. Server Component. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/shopify/client.ts` | `src/lib/env.ts` | `import { env }` | VERIFIED | Line 1 imports env. Uses `env.SHOPIFY_STORE_URL`, `env.SHOPIFY_CLIENT_ID`, `env.SHOPIFY_CLIENT_SECRET`. (Deviated from plan's `SHOPIFY_ACCESS_TOKEN` but env import is wired.) |
| `src/app/api/webhooks/shopify/route.ts` | `src/lib/shopify/webhooks.ts` | `verifyShopifyWebhook` call before processing | VERIFIED | Line 40: `if (!verifyShopifyWebhook(rawBody, hmacHeader))` — called before any JSON.parse |
| `src/app/api/webhooks/shopify/route.ts` | `src/inngest/client.ts` | `inngest.send` to dispatch events | VERIFIED | Lines 73-81: `await inngest.send({ name: 'shopify/webhook.received', data: {...} })` |
| `src/lib/shopify/sync.ts` | `src/lib/shopify/client.ts` | `shopifyClient.query` for GraphQL calls | VERIFIED | Line 1 imports `shopifyClient`. Used in `startFullSync` (line 157), `startIncrementalSync` (line 456), and single-resource helpers. |
| `src/lib/db/queries.ts` | `src/lib/db/schema.ts` | imports table definitions | VERIFIED | Line 2: `import { customers, orders, syncLogs, webhookDeliveries } from './schema'` |
| `src/lib/shopify/sync.ts` | `src/lib/db/queries.ts` | `upsertCustomer`/`upsertOrder` imports | VERIFIED | Lines 9-16: imports `upsertCustomer`, `upsertOrder`, `createSyncLog`, `updateSyncLog`, `getLatestSyncLog`, `getFailedSyncWithCursor` |
| `src/components/sync-indicator.tsx` | `/api/sync/status` | polling fetch | VERIFIED | Line 69: `const res = await fetch('/api/sync/status')` |
| `src/components/sync-indicator.tsx` | `/api/sync` | POST to trigger sync | VERIFIED | Line 106: `await fetch('/api/sync', { method: 'POST', ... })` |
| `src/app/(dashboard)/layout.tsx` | `src/components/sync-indicator.tsx` | `SyncIndicator` rendered in nav | VERIFIED | Line 3: `import { SyncIndicator }`. Line 82: `<SyncIndicator />` |

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| SHOP-01: Cost-based throttling | VERIFIED | `shopifyGraphQL` checks `currentlyAvailable < requestedQueryCost * 2`, sleeps to refill |
| SHOP-02: bulkOperationRunQuery full sync | VERIFIED | `startFullSync` calls `BULK_CUSTOMERS_QUERY` via `shopifyClient.query` |
| SHOP-03: Async bulk via webhook completion | PARTIAL | `bulk_operations/finish` handled inline in switch-case. But failure path (non-completed status) does not update syncLog. |
| SHOP-04: HMAC verify before parsing | VERIFIED | `request.text()` called on line 35 before any JSON.parse (line 65). `verifyShopifyWebhook` called on line 40. |
| SHOP-05: Webhook idempotency | PARTIAL | Route-level dedup via `checkWebhookIdempotency` is correct. But upsert-level last-write-wins does not actually compare timestamps. |
| SHOP-06: Incremental handlers for all 4 topics | VERIFIED | `processShopifyWebhook` handles `orders/create`, `orders/updated`, `customers/create`, `customers/update`, `customers/delete`. |
| SHOP-07: All money via NUMERIC/Decimal | VERIFIED | No `parseFloat` calls in shopify/, db/queries.ts, or inngest/functions.ts. All money through `new Decimal(amount).toString()`. |
| SHOP-08: `is_historical` flag on bulk-synced orders | VERIFIED | `processFullSyncResults` line 342: `isHistorical = createdAt != null && createdAt < syncStartedAt` |
| SHOP-09: Sync status UI | VERIFIED | Nav indicator with three states, "Last synced X ago", stale alert, Sync Now button, `/settings/sync` page. |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/inngest/functions.ts` | 132-138 | `break` without updating syncLog when `bulk_operations/finish` arrives with non-completed status | Blocker | Failed bulk operations leave syncLog in 'running' state permanently, blocking resume and stale detection |
| `src/inngest/functions.ts` | 193 | Comment references "onFailure handler below" that does not exist | Warning | Dead-letter webhook delivery tracking is advertised but not implemented |
| `src/lib/db/queries.ts` | 88-93 | `setWhere` only checks shop_id/shopify_id, not incoming vs stored shopifyUpdatedAt | Warning | Last-write-wins claim in comment is false — out-of-order webhooks can overwrite newer data |

---

### Human Verification Required

#### 1. Nav Sync Indicator Visual States

**Test:** Run `npm run dev`, open the dashboard URL in a browser. The nav bar should show a red AlertCircle icon with a red dot badge (stale state, since no sync has run).
**Expected:** Red icon + badge visible in top-right of nav. Hovering or clicking opens Popover showing "Shopify Sync" header with "Stale" badge.
**Why human:** Visual rendering cannot be verified programmatically.

#### 2. Webhook Unauthorized Rejection

**Test:** Send `curl -X POST http://localhost:3000/api/webhooks/shopify -d '{}'` with no HMAC header.
**Expected:** Response is `401 Unauthorized`.
**Why human:** Needs an actual HTTP request against a running server.

#### 3. Settings/sync Advanced Toggle

**Test:** Visit `/settings/sync`. Click the "Advanced" text. Verify the Force Full Sync button appears. Click it and verify an AlertDialog opens with a confirmation message.
**Expected:** Force Full Sync is hidden until Advanced is toggled. AlertDialog warns about re-importing all data.
**Why human:** UI interaction flow.

---

### Gaps Summary

Three issues block complete goal achievement:

**Gap 1 (Blocker): `bulk_operations/finish` failure path does not update syncLog.**
In `src/inngest/functions.ts` lines 132-138, when Shopify signals a bulk operation finished with any status other than 'completed' (e.g., 'failed', 'cancelled'), the code logs a warning and does `break` — never calling `updateSyncLog`. This leaves the syncLog in 'running' status permanently. The stale detection, resume logic, and dead-letter tracking all depend on correct syncLog status. Additionally, the onFailure dead-letter handler referenced in a comment on line 193 does not exist in the codebase.

**Gap 2 (Warning): Last-write-wins timestamp comparison is missing.**
In `src/lib/db/queries.ts`, the `onConflictDoUpdate.setWhere` for both `upsertCustomer` (lines 88-93) and `upsertOrder` (lines 162-167) only checks `eq(shopId) AND eq(shopifyId)`. This condition is always true on conflict, meaning the update always applies regardless of whether the incoming `shopifyUpdatedAt` is older than what is stored. True last-write-wins requires comparing the timestamp against the stored column value, e.g., using `or(isNull(customers.shopifyUpdatedAt), lte(customers.shopifyUpdatedAt, incomingDate))`.

**Gap 3 (Documentation): env var mismatch.**
The plan, CLAUDE.md, REQUIREMENTS.md, and multiple planning docs reference `SHOPIFY_ACCESS_TOKEN`. A post-plan refactor (`ea8b9bb`) replaced it with `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET`. The runtime code is correct, but documentation is inconsistent. Not a code blocker.

---

_Verified: 2026-02-19T10:30:00Z_
_Verifier: Claude (gsd-verifier)_
