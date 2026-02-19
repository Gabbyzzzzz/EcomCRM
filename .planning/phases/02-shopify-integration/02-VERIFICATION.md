---
phase: 02-shopify-integration
verified: 2026-02-19T10:57:16Z
status: human_needed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  gaps_closed:
    - "bulk_operations/finish failure path now calls updateSyncLog with status='failed' — syncLogs no longer stranded in 'running'"
    - "onFailure dead-letter handler (processShopifyWebhookFailure) now exists, is guarded by function_id check, calls updateWebhookDeliveryStatus, and is in functions array"
    - "upsertCustomer setWhere now uses or(isNull, lte) — older webhook replays cannot overwrite newer stored data"
    - "upsertOrder setWhere now uses or(isNull, lte) — same last-write-wins semantics as upsertCustomer"
    - "updateWebhookDeliveryStatus exported from queries.ts as plain UPDATE (not insert-or-ignore) — dead-letter status correctly flips existing 'processing' row"
    - "SHOPIFY_ACCESS_TOKEN removed from CLAUDE.md, REQUIREMENTS.md, STACK.md, INTEGRATIONS.md, STRUCTURE.md, CONCERNS.md — all six now reference SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Run npm run dev, open the dashboard, verify the nav shows a red AlertCircle icon with a red dot badge (stale state — no sync has run)"
    expected: "Red icon + badge visible in top-right of nav. Hovering/clicking opens Popover showing 'Shopify Sync' header with 'Stale' badge."
    why_human: "Visual rendering cannot be verified programmatically"
  - test: "Send curl -X POST http://localhost:3000/api/webhooks/shopify -d '{}' with no X-Shopify-Hmac-Sha256 header"
    expected: "Response is 401 Unauthorized"
    why_human: "Needs an actual HTTP request against a running server"
  - test: "Visit /settings/sync. Click the 'Advanced' text. Verify Force Full Sync button appears. Click it and verify an AlertDialog opens."
    expected: "Force Full Sync is hidden until Advanced is toggled. AlertDialog warns about re-importing all data."
    why_human: "UI interaction flow cannot be verified programmatically"
---

# Phase 2: Shopify Integration Verification Report (Re-verification)

**Phase Goal:** Real Shopify customer and order data is in the database, kept current via webhooks
**Verified:** 2026-02-19T10:57:16Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plans 02-04 and 02-05)

## Re-verification Summary

Previous status: `gaps_found` (3/5 truths, 3 code/documentation gaps)
Current status: `human_needed` (5/5 truths, 0 remaining code gaps, 3 human tests)

All three gaps from the initial verification are now closed:
- **Gap 1 (Blocker):** bulk_operations/finish failure path + dead-letter handler — FIXED
- **Gap 2 (Warning):** last-write-wins timestamp comparison — FIXED
- **Gap 3 (Documentation):** SHOPIFY_ACCESS_TOKEN replaced by SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET across all six doc surfaces — FIXED

Commits: `e95d8d1` (last-write-wins fix), `f55e186` (failure path + dead-letter handler), `55905fd` (CLAUDE.md + REQUIREMENTS.md), `7b88684` (codebase map docs)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Full sync loads all customers and orders with NUMERIC money and `is_historical` flag | VERIFIED | `processFullSyncResults` uses `new Decimal()` for all money fields (sync.ts lines 67-105). `isHistorical` set at line 343: `createdAt != null && createdAt < syncStartedAt`. Column exists in schema and migration 0001. |
| 2 | Webhook returns 200 only after HMAC verification passes and upserts idempotently | VERIFIED | HMAC verified (webhooks.ts `crypto.timingSafeEqual`) before JSON parse. `checkWebhookIdempotency` deduplicates by webhookId. `bulk_operations/finish` failure path NOW queries syncLog by bulkOperationId and calls `updateSyncLog(status='failed')` at functions.ts lines 144-160. `onFailure` handler exists as `processShopifyWebhookFailure` (lines 221-246). |
| 3 | Duplicate webhook with same `X-Shopify-Webhook-Id` results in only one DB record | VERIFIED | Route-level: `checkWebhookIdempotency` blocks re-processing. Upsert-level: `setWhere` NOW uses `or(isNull(customers.shopifyUpdatedAt), lte(customers.shopifyUpdatedAt, data.shopifyUpdatedAt))` (queries.ts lines 88-93) and same pattern for orders (lines 162-167). Old webhook replays cannot overwrite newer data. |
| 4 | UI shows "Last synced X ago" and alerts when stale (>24h) | VERIFIED | `formatRelativeTime` and `isStale` logic unchanged — still present and correct in sync-indicator.tsx. No regression. |
| 5 | GraphQL backs off on low budget — no 429 crashes | VERIFIED | Throttling logic unchanged in client.ts. Documentation mismatch (Gap 3) now resolved: CLAUDE.md, REQUIREMENTS.md, and codebase map docs all reference SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET, matching env.ts exactly. Zero SHOPIFY_ACCESS_TOKEN references remain in documentation. |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/db/queries.ts` | VERIFIED | Imports `lte, or, isNull` from drizzle-orm (line 3). Both upsert setWhere blocks use `or(isNull, lte)` pattern. `updateWebhookDeliveryStatus` exported as plain `.update()` — correctly flips 'processing' to 'dead_letter' without silently skipping. |
| `src/inngest/functions.ts` | VERIFIED | `processShopifyWebhookFailure` exported (lines 221-246). Functions array has 3 entries: `processShopifyWebhook`, `processShopifyWebhookFailure`, `scheduledSync` (lines 271-275). Failure path calls `updateSyncLog(status='failed')` (lines 155-159). `updateWebhookDeliveryStatus` imported at line 10. Old stale comment replaced with accurate description at line 209. |
| `CLAUDE.md` | VERIFIED | Zero SHOPIFY_ACCESS_TOKEN references. SHOPIFY_CLIENT_ID present in both Shopify Integration section and Env Vars block. |
| `.planning/REQUIREMENTS.md` | VERIFIED | FOUND-05 lists SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET. Zero SHOPIFY_ACCESS_TOKEN references. |
| `.planning/codebase/STACK.md` | VERIFIED | Zero SHOPIFY_ACCESS_TOKEN references. SHOPIFY_CLIENT_ID present. |
| `.planning/codebase/INTEGRATIONS.md` | VERIFIED | Zero SHOPIFY_ACCESS_TOKEN references. SHOPIFY_CLIENT_ID present (7 total references across codebase/ docs). |
| `.planning/codebase/STRUCTURE.md` | VERIFIED | Zero SHOPIFY_ACCESS_TOKEN references. |
| `.planning/codebase/CONCERNS.md` | VERIFIED | Zero SHOPIFY_ACCESS_TOKEN references. SHOPIFY_CLIENT_ID present. |

All artifacts from the initial verification that were already VERIFIED remain unchanged and passing (no regressions detected).

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/inngest/functions.ts` (bulk_operations/finish failure) | `src/lib/db/queries.ts` (updateSyncLog) | db query by bulkOperationId then updateSyncLog call | VERIFIED | Lines 144-160: queries syncLogs by `eq(syncLogs.bulkOperationId, bulkPayload.admin_graphql_api_id)`, then calls `updateSyncLog(failedSyncLog.id, { status: 'failed', errorMessage: ..., completedAt: ... })`. |
| `src/inngest/functions.ts` (processShopifyWebhookFailure) | `src/lib/db/queries.ts` (updateWebhookDeliveryStatus) | imported at line 10, called at line 244 | VERIFIED | `updateWebhookDeliveryStatus` imported (line 10). Called as `await updateWebhookDeliveryStatus(shopId, webhookId, 'dead_letter')` (line 244). Function guarded by `event.data.function_id !== 'process-shopify-webhook'` (line 229). |
| `src/lib/db/queries.ts` (upsertCustomer setWhere) | `customers.shopifyUpdatedAt` column | `lte` comparison against incoming data.shopifyUpdatedAt | VERIFIED | Lines 88-93: `or(isNull(customers.shopifyUpdatedAt), lte(customers.shopifyUpdatedAt, data.shopifyUpdatedAt))`. Old `eq(shopId) AND eq(shopifyId)` pattern gone. |
| `src/lib/db/queries.ts` (upsertOrder setWhere) | `orders.shopifyUpdatedAt` column | `lte` comparison against incoming data.shopifyUpdatedAt | VERIFIED | Lines 162-167: `or(isNull(orders.shopifyUpdatedAt), lte(orders.shopifyUpdatedAt, data.shopifyUpdatedAt))`. Same pattern as upsertCustomer. |
| `CLAUDE.md` (Env Vars section) | `src/lib/env.ts` (envSchema) | documentation mirror | VERIFIED | CLAUDE.md lists 11 vars matching env.ts exactly. No SHOPIFY_ACCESS_TOKEN in either. |

All key links from initial verification that were VERIFIED remain intact (no regressions).

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| SHOP-01: Cost-based throttling | VERIFIED | Unchanged. `shopifyGraphQL` checks `currentlyAvailable < requestedQueryCost * 2` and sleeps to refill. |
| SHOP-02: bulkOperationRunQuery full sync | VERIFIED | Unchanged. `startFullSync` calls `BULK_CUSTOMERS_QUERY` via `shopifyClient.query`. |
| SHOP-03: Async bulk via webhook completion | VERIFIED | Failure path now calls `updateSyncLog(status='failed')`. Both completed and failed paths correctly update syncLog. |
| SHOP-04: HMAC verify before parsing | VERIFIED | Unchanged. `request.text()` before `JSON.parse`, HMAC verified first. |
| SHOP-05: Webhook idempotency | VERIFIED | Route-level dedup correct. Upsert-level last-write-wins now real (timestamp comparison, not always-true eq). |
| SHOP-06: Incremental handlers for all webhook topics | VERIFIED | Unchanged. All 5 topics handled (orders/create, orders/updated, customers/create, customers/update, customers/delete). |
| SHOP-07: All money via NUMERIC/Decimal | VERIFIED | Unchanged. No parseFloat calls in shopify/, db/queries.ts, or inngest/functions.ts. |
| SHOP-08: `is_historical` flag on bulk-synced orders | VERIFIED | Unchanged. `isHistorical = createdAt != null && createdAt < syncStartedAt`. |
| SHOP-09: Sync status UI | VERIFIED | Unchanged. Nav indicator, stale alert, Sync Now button, /settings/sync page all intact. |
| FOUND-05: All env vars documented and loaded | VERIFIED | REQUIREMENTS.md FOUND-05 now lists correct 11 env vars matching env.ts. |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No anti-patterns found. All previously-flagged stubs and dead-letter reference issues are resolved.

---

### Regression Check

| Previously-passing Truth | Regression Check | Result |
|--------------------------|-----------------|--------|
| Truth 1: Full sync Decimal + isHistorical | `new Decimal` calls and `isHistorical` assignment present in sync.ts | NO REGRESSION |
| Truth 4: UI stale indicator | `isStale`, `formatRelativeTime`, `STALE_THRESHOLD` all present in sync-indicator.tsx | NO REGRESSION |
| All 9 key links from initial verification | Spot-checked: inngest.send, verifyShopifyWebhook, SyncIndicator in layout.tsx | NO REGRESSION |

---

### Human Verification Required

#### 1. Nav Sync Indicator Visual States

**Test:** Run `npm run dev`, open the dashboard URL in a browser. The nav bar should show a red AlertCircle icon with a red dot badge (stale state, since no sync has run).
**Expected:** Red icon + badge visible in top-right of nav. Hovering or clicking opens Popover showing "Shopify Sync" header with "Stale" badge.
**Why human:** Visual rendering cannot be verified programmatically.

#### 2. Webhook Unauthorized Rejection

**Test:** Send `curl -X POST http://localhost:3000/api/webhooks/shopify -d '{}'` with no X-Shopify-Hmac-Sha256 header.
**Expected:** Response is `401 Unauthorized`.
**Why human:** Needs an actual HTTP request against a running server.

#### 3. Settings/sync Advanced Toggle

**Test:** Visit `/settings/sync`. Click the "Advanced" text. Verify the Force Full Sync button appears. Click it and verify an AlertDialog opens with a confirmation message.
**Expected:** Force Full Sync is hidden until Advanced is toggled. AlertDialog warns about re-importing all data.
**Why human:** UI interaction flow cannot be verified programmatically.

---

### Gaps Summary

No code or documentation gaps remain. All three gaps from the initial verification are fully resolved:

- **Gap 1 (Blocker — RESOLVED):** `bulk_operations/finish` failure path now queries syncLog by `bulkOperationId` and calls `updateSyncLog(status='failed', completedAt: new Date())`. The dead-letter `onFailure` handler (`processShopifyWebhookFailure`) now exists, is correctly guarded by `function_id` check, calls `updateWebhookDeliveryStatus` (plain UPDATE, not insert-or-ignore), and is included in the functions array. `updateWebhookDeliveryStatus` is exported from queries.ts.

- **Gap 2 (Warning — RESOLVED):** Both `upsertCustomer` and `upsertOrder` setWhere now use `or(isNull(col.shopifyUpdatedAt), lte(col.shopifyUpdatedAt, data.shopifyUpdatedAt))`. The old always-true `eq(shopId) AND eq(shopifyId)` pattern is gone. Older webhook replays are now genuinely prevented from overwriting newer stored data.

- **Gap 3 (Documentation — RESOLVED):** Zero `SHOPIFY_ACCESS_TOKEN` references remain in CLAUDE.md, REQUIREMENTS.md, STACK.md, INTEGRATIONS.md, STRUCTURE.md, or CONCERNS.md. All six files reference `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` consistent with `src/lib/env.ts`.

The phase goal is fully implemented in code. Only human verification of visual/runtime behavior remains outstanding.

---

_Verified: 2026-02-19T10:57:16Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — closes gaps from 2026-02-19T10:30:00Z initial verification_
