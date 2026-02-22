---
phase: 08-pipeline-verification-and-toggle-fix
plan: 01
subsystem: api
tags: [inngest, shopify-webhooks, automation, resend, rest-normalization, pipeline]

# Dependency graph
requires:
  - phase: 05-automation-engine
    provides: Inngest functions (processFirstOrder, processSegmentChange, processCartAbandoned, checkDaysSinceOrder), executeEmailAction, fetchEnabledAutomationsByTrigger
  - phase: 04-email-infrastructure
    provides: sendMarketingEmail, message_logs schema
  - phase: 02-shopify-integration
    provides: Shopify webhook ingestion route, ShopifyOrder/ShopifyCustomer types
provides:
  - REST webhook payload normalization (normalizeRestOrder, normalizeRestCustomer) in src/inngest/functions.ts
  - Pipeline breadcrumb logging at all key automation pipeline points
  - Manual test-trigger endpoint POST /api/automations/test-trigger covering all 4 trigger types
  - Confirmed-correct checkDaysSinceOrder cron wiring with inline audit comment
affects: [09-automation-toggle-fix, any future webhook debugging]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - REST webhook normalization pattern: normalizeRestOrder/normalizeRestCustomer map Shopify REST API snake_case format to internal GraphQL-format types before processing
    - [pipeline] console.log breadcrumbs at all key pipeline decision points for debugging
    - Dev-only API endpoint pattern: check process.env.NODE_ENV === 'production' at top of handler, return 403

key-files:
  created:
    - src/app/api/automations/test-trigger/route.ts
  modified:
    - src/inngest/functions.ts
    - src/lib/automation/actions.ts

key-decisions:
  - "Shopify REST webhooks normalize to GraphQL-format types (ShopifyOrder/ShopifyCustomer) at the Inngest function boundary, not at the webhook route — keeps the webhook route simple and lets normalization live near the processing logic"
  - "days_since_order test-trigger uses direct invocation (fetchEnabledAutomationsByTrigger + executeEmailAction) not Inngest event, because the trigger is cron-driven with no corresponding event name"
  - "normalizeRestOrder converts numeric Shopify IDs to GID format (gid://shopify/Order/N) to match DB-stored GID shopifyId values"

patterns-established:
  - "REST webhook normalization: normalizeRestOrder/normalizeRestCustomer functions handle the Shopify REST-to-internal-type mapping inline in functions.ts"
  - "[pipeline] log prefix for automation pipeline breadcrumbs — consistent prefix enables grep-based debugging"

# Metrics
duration: 4min
completed: 2026-02-21
---

# Phase 8 Plan 1: Pipeline Verification and Automation Test-Trigger Summary

**REST webhook payload normalization added to fix GID/snake_case mismatches, plus a dev test-trigger endpoint at POST /api/automations/test-trigger covering all 5 automation flows**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-21T13:14:12Z
- **Completed:** 2026-02-21T13:18:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Identified and fixed critical payload format mismatch: Shopify REST webhooks send snake_case flat JSON but code was treating them as GraphQL format (camelCase nested). This caused silent failures: GID customer lookup missing (numeric `customer.id` vs GID-format DB record), totalPrice null (wrong field path), tags stored as single string instead of array.
- Added `normalizeRestOrder()` and `normalizeRestCustomer()` in functions.ts with smoke-test comments documenting the exact REST→GraphQL field mapping.
- Audited and confirmed all 9 Inngest function event names are consistent between senders and receivers (no event name mismatches found).
- Audited `checkDaysSinceOrder` cron path — confirmed it correctly calls `fetchEnabledAutomationsByTrigger(shopId, 'days_since_order')`, exercises both Repurchase Prompt and Win-Back Campaign automations, uses inline segment filter, and has duplicate-send guard.
- Created `POST /api/automations/test-trigger` endpoint that fires all 4 trigger types (covering all 5 preset flows), guarded against production use.

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit pipeline wiring and fix payload format issues** - `29148a1` (fix)
2. **Task 2: Create manual test-trigger API endpoint** - `6ca324e` (feat)

## Files Created/Modified

- `src/inngest/functions.ts` — Added `RestWebhookOrder` and `RestWebhookCustomer` interface types, `normalizeRestOrder()` and `normalizeRestCustomer()` normalization functions with smoke-test comment blocks, updated `orders/create` and `customers/create` handlers to use normalizers, added `[pipeline]` console.log breadcrumbs at all key points, added detailed cron audit comment to `checkDaysSinceOrder`
- `src/lib/automation/actions.ts` — Added `[pipeline]` breadcrumb log before `sendMarketingEmail` call in `executeEmailAction`
- `src/app/api/automations/test-trigger/route.ts` — New POST endpoint supporting all 4 trigger types with zod validation, customer lookup, production guard, and structured response

## Decisions Made

- **Normalization at Inngest boundary, not webhook route:** The webhook route stays simple (HMAC verify → parse → dispatch to Inngest). Normalization happens in `processShopifyWebhook` where the payload is first consumed. This keeps the route lean and lets the normalization logic live near the switch-case that uses it.
- **days_since_order uses direct invocation in test-trigger:** Since `checkDaysSinceOrder` is a cron function with no corresponding event name, the test-trigger endpoint calls `fetchEnabledAutomationsByTrigger + executeEmailAction` directly. This exercises the exact same action path the cron uses (confirmed in Task 1 audit).
- **GID normalization in `normalizeRestOrder`:** REST webhooks send numeric `order.id` (e.g. `123`) and `customer.id` (e.g. `456`). The DB stores GID-format shopifyIds (e.g. `gid://shopify/Customer/456`). The normalizer converts numeric IDs to GID format so the DB lookup `eq(customersTable.shopifyId, order.customer.id)` matches correctly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Customer lookup silent failure due to ID format mismatch**
- **Found during:** Task 1 (pipeline audit)
- **Issue:** REST webhook sends `customer.id` as a numeric value (e.g. `456`), but `processShopifyWebhook` compared it directly against `customersTable.shopifyId` which stores GID format (`gid://shopify/Customer/456`). The `eq()` comparison always returned no rows, so `updateCustomerCountersFromOrders` never ran and `automation/first_order` was never emitted.
- **Fix:** `normalizeRestOrder` converts numeric `customer.id` to GID format before the DB lookup runs.
- **Files modified:** src/inngest/functions.ts
- **Verification:** TypeScript compiles cleanly; smoke-test comment documents input→output mapping for visual verification.
- **Committed in:** 29148a1 (Task 1 commit)

**2. [Rule 1 - Bug] Order totalPrice always null due to wrong field path**
- **Found during:** Task 1 (pipeline audit)
- **Issue:** Code accessed `order.totalPriceSet?.shopMoney?.amount` (GraphQL path) but REST webhooks have `total_price` (flat string). Always resolved to `null`, storing null totalPrice in orders table.
- **Fix:** `normalizeRestOrder` maps `total_price` → `totalPriceSet.shopMoney.amount`.
- **Files modified:** src/inngest/functions.ts
- **Committed in:** 29148a1 (Task 1 commit)

**3. [Rule 1 - Bug] Customer tags stored as single string instead of string array**
- **Found during:** Task 1 (pipeline audit)
- **Issue:** REST webhooks send `tags` as a comma-separated string (e.g. `"vip,loyal"`). Code passed this directly as the `tags` array, resulting in a single-element array `["vip,loyal"]` instead of `["vip", "loyal"]`.
- **Fix:** `normalizeRestCustomer` splits `raw.tags` on comma and trims each entry.
- **Files modified:** src/inngest/functions.ts
- **Committed in:** 29148a1 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - Bug)
**Impact on plan:** All three fixes are critical correctness issues found during the planned pipeline audit. No scope creep — the plan specifically asked to find and fix payload format issues.

## Issues Encountered

None beyond the payload format bugs documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Pipeline normalization is in place — webhook events will now correctly look up customers by GID and update counters.
- Test-trigger endpoint is ready for manual end-to-end verification: `POST /api/automations/test-trigger` with `{ "triggerType": "first_order", "customerId": "<real-uuid>" }`.
- Phase 8 Plan 2 (automation toggle fix) can proceed — the toggle PATCH endpoint fix is independent of pipeline wiring.

---
*Phase: 08-pipeline-verification-and-toggle-fix*
*Completed: 2026-02-21*

## Self-Check: PASSED

- FOUND: src/app/api/automations/test-trigger/route.ts
- FOUND: src/inngest/functions.ts
- FOUND: src/lib/automation/actions.ts
- FOUND: .planning/phases/08-pipeline-verification-and-toggle-fix/08-01-SUMMARY.md
- FOUND commit: 29148a1 (fix: normalize REST webhook payloads)
- FOUND commit: 6ca324e (feat: test-trigger endpoint)
