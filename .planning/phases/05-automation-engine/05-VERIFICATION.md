---
phase: 05-automation-engine
verified: 2026-02-19T14:25:37Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 5: Automation Engine Verification Report

**Phase Goal:** All 5 preset flows evaluate triggers, wait delays, and execute actions on real customer events — with no duplicate sends and no fires on historical data
**Verified:** 2026-02-19T14:25:37Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Placing a first order triggers welcome flow: after 1-hour delay, welcome email arrives — no duplicate send on Inngest retry | VERIFIED | `processFirstOrder` listens to `automation/first_order`, calls `step.sleep` with `${delayValue}h`, uses idempotency key `${automationId}-${customerId}-${eventTimestamp}` from stable event.data |
| 2 | Starting a cart abandonment then completing order within 2 hours cancels the abandoned-cart email | VERIFIED | `processCartAbandoned` checks `db.select().from(ordersTable).where(gte(shopifyCreatedAt, eventTimestamp), eq(isHistorical, false))` after sleep; if row found, returns without sending |
| 3 | At_risk or hibernating customer with no order in 90 days receives win-back email without manual action | VERIFIED | `checkDaysSinceOrder` cron (0 3 * * *) scans customers by `lte(lastOrderAt, cutoffDate)`, filters by `config?.segments = ['at_risk', 'hibernating']`, guards duplicates via `getRecentMessageLog` |
| 4 | Champion-segment customer receives VIP email and "vip" tag is added to Shopify record | VERIFIED | `processSegmentChange` checks `config.toSegment === newSegment`, calls `executeEmailAction` then `executeTagAction(shopId, customer.shopifyId, 'vip', 'add')` via `alsoAddTag` in actionConfig |
| 5 | No automation fires on historical orders (is_historical = true excluded) | VERIFIED | `automation/first_order` only emitted in `orders/create` topic (never `orders/updated`); re-fetched `orderCount === 1` guard added; cart cancellation check explicitly filters `eq(isHistorical, false)` |
| 6 | Automation list page shows all 5 preset flows; toggling enable/disable persists to DB | VERIFIED | `/automations` Server Component calls `listAutomations(shopId)` and renders table with `AutomationToggle`; PATCH `/api/automations/[id]` calls `setAutomationEnabled` with zod-validated body |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/automation/engine.ts` | fetchEnabledAutomationsByTrigger, evaluateSegmentFilter | VERIFIED | Both functions exported; DB query with `eq(enabled, true)` and `eq(triggerType, ...)` filter |
| `src/lib/automation/actions.ts` | executeEmailAction, executeTagAction | VERIFIED | SUBJECT_MAP with all 5 keys; templateFactory switch on emailTemplateId; executeTagAction is best-effort (catch+log) |
| `src/lib/automation/presets.ts` | PRESET_AUTOMATIONS with 5 entries | VERIFIED | 5 entries: Welcome Flow, Abandoned Cart Recovery, Repurchase Prompt, Win-Back Campaign, VIP Welcome |
| `src/lib/db/queries.ts` | 5 new automation query functions + getRecentMessageLog | VERIFIED | getEnabledAutomationsByTrigger, upsertAutomation, listAutomations, setAutomationEnabled, updateAutomationLastRun, getRecentMessageLog all present |
| `src/lib/db/schema.ts` | automations_shop_name_unique uniqueIndex | VERIFIED | Line 165: `uniqueIndex('automations_shop_name_unique').on(table.shopId, table.name)` |
| `src/inngest/functions.ts` | processFirstOrder, processSegmentChange, processCartAbandoned, checkDaysSinceOrder in functions array | VERIFIED | All 4 functions at IDs process-first-order, process-segment-change, process-cart-abandoned, check-days-since-order; all 9 functions in exported array |
| `src/app/api/automations/seed/route.ts` | POST endpoint seeding 5 preset automations | VERIFIED | Loops PRESET_AUTOMATIONS, calls upsertAutomation, returns `{ seeded: N, automations: [...] }` |
| `src/app/api/automations/[id]/route.ts` | PATCH endpoint for enable/disable toggle | VERIFIED | Zod-validates `{ enabled: boolean }`, calls `setAutomationEnabled`, returns `{ ok: true }` |
| `src/app/(dashboard)/automations/page.tsx` | Server Component listing all 5 flows | VERIFIED | 143 lines; calls `listAutomations(shopId)`; renders table with name, trigger, delay, action, status badge, lastRunAt, toggle |
| `src/components/automation-toggle.tsx` | Client toggle with router.refresh() | VERIFIED | `useTransition` + `router.refresh()` after PATCH fetch |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `processShopifyWebhook` orders/create | `automation/first_order` event | `orderCount === 1` after counter update, topic='orders/create' | WIRED | Lines 123-145: re-fetches customer, checks `updatedCustomer?.orderCount === 1`, wraps emit in try/catch |
| `processFirstOrder` | `fetchEnabledAutomationsByTrigger` | trigger_type='first_order' | WIRED | `step.run('fetch-automations', () => fetchEnabledAutomationsByTrigger(shopId, 'first_order'))` |
| `executeEmailAction` | `sendMarketingEmail` | templateFactory pattern | WIRED | Builds templateFactory switch, calls `sendMarketingEmail({ shopId, customerInternalId, subject, templateFactory, idempotencyKey, automationId })` |
| `executeTagAction` | `shopifyGraphQL` | tagsAdd/tagsRemove mutation | WIRED | `shopifyGraphQL` called with `mutation tagsAdd` or `tagsRemove` based on action param |
| `checkDaysSinceOrder` | `fetchEnabledAutomationsByTrigger` | trigger_type='days_since_order' | WIRED | `step.run('fetch-automations', () => fetchEnabledAutomationsByTrigger(shopId, 'days_since_order'))` |
| `checkDaysSinceOrder` | `getRecentMessageLog` | duplicate-send guard before executeEmailAction | WIRED | `const alreadySent = await getRecentMessageLog(customer.id, automation.id, dedupeWindowStart)` |
| `/automations page` | `listAutomations` | direct server component DB call | WIRED | `const automationList = await listAutomations(shopId)` line 44 |
| `/api/automations/[id]` | `setAutomationEnabled` | PATCH handler | WIRED | `await setAutomationEnabled(params.id, parsed.data.enabled)` |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| First-order welcome flow (1h delay, idempotent) | SATISFIED | processFirstOrder: step.sleep + stable idempotency key from event.data.eventTimestamp |
| Cart abandonment cancellation on order completion | SATISFIED | processCartAbandoned: DB check for post-eventTimestamp non-historical orders after sleep |
| Win-back for at_risk/hibernating (90 days) | SATISFIED | checkDaysSinceOrder with Win-Back Campaign config `{ days: 90, segments: ['at_risk', 'hibernating'] }` |
| VIP email + Shopify tag on champion segment | SATISFIED | processSegmentChange: executeEmailAction + executeTagAction for alsoAddTag='vip' |
| Historical data exclusion | SATISFIED | first_order emit only on orders/create topic (isHistorical=false by design); cart cancellation explicitly filters isHistorical=false |
| Automation list UI with enable/disable | SATISFIED | /automations page + PATCH API + AutomationToggle client component |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No placeholders, TODO comments, empty implementations, or stub handlers found in any of the modified files.

### TypeScript Verification

`npx tsc --noEmit` (via `node node_modules/typescript/lib/tsc.js --noEmit`) passes with zero errors across all modified files.

### Key Behavioral Details Verified

**Idempotency (no duplicate sends):**
- `processFirstOrder`: uses `eventTimestamp` from `event.data` (stable across retries) in key `${automationId}-${customerId}-${eventTimestamp}`, forwarded to Resend's idempotencyKey
- `processSegmentChange`: reads `eventTimestamp` from `event.data` — NOT `new Date()` — per CRITICAL comment at line 516; `recalcTimestamp` generated ONCE inside `step.run('emit-segment-changes')` and shared across all events in the batch
- `checkDaysSinceOrder`: `getRecentMessageLog` guard prevents re-sending to same customer every cron run until a new order is placed

**Historical data exclusion:**
- `automation/first_order` only emitted for `orders/create` topic (webhook orders are always `isHistorical=false` by design; comment at line 98)
- `orderCount === 1` guard ensures only genuine first-time orders trigger the welcome flow
- Cart cancellation check uses `eq(ordersTable.isHistorical, false)` explicitly

**VIP tag addition:**
- `processSegmentChange` reads `actionConfig.alsoAddTag`, re-fetches customer via `getCustomerByInternalId` to get `shopifyId`, calls `executeTagAction` as best-effort (catch+log)

**Toggle persistence:**
- `AutomationToggle` sends PATCH to `/api/automations/${id}` with `{ enabled: !enabled }`, then calls `router.refresh()` via `useTransition`
- PATCH handler calls `setAutomationEnabled` which does `db.update(automations).set({ enabled })` — change persists in DB and page reflects on refresh

### Human Verification Required

The following items cannot be verified programmatically:

**1. End-to-end first-order welcome email delivery**
- Test: Place a first order via Shopify webhook (or trigger `automation/first_order` event manually in Inngest Dev), wait 1 hour (or use time-travel in Inngest Dev)
- Expected: Welcome email arrives in customer inbox with correct subject "Welcome to our store!" and unsubscribe link
- Why human: Requires live Resend API key, actual email delivery, and 1-hour wait (or Inngest dev time-travel)

**2. Inngest Dev Server function registration**
- Test: Start dev server with `npm run dev` and Inngest dev with `npx inngest-cli@latest dev`, open http://localhost:8288
- Expected: 9 registered functions visible including processFirstOrder, processSegmentChange, processCartAbandoned, checkDaysSinceOrder
- Why human: Cannot verify Inngest registration without running the dev server

**3. Automation page visual rendering**
- Test: POST /api/automations/seed then visit /automations
- Expected: All 5 flows listed with names, human-readable trigger labels, correct delay display ("1 hours", "2 hours", "—"), status badges, "Never" for lastRunAt
- Why human: Visual verification of rendered UI

**4. Toggle persistence end-to-end**
- Test: Disable "VIP Welcome" via toggle on /automations, refresh page
- Expected: Row shows "Disabled" badge; re-enabling restores "Active" badge
- Why human: Requires browser interaction and DB state observation

## Gaps Summary

No gaps found. All 6 observable truths are verified against the actual codebase:

1. The welcome flow correctly uses `step.sleep`, stable eventTimestamp-based idempotency keys, and the Resend idempotencyKey param to prevent duplicate sends on retry.
2. Cart abandonment cancellation performs a real DB query checking for orders placed after eventTimestamp with `isHistorical=false`, not a mock or stub.
3. Win-back flow is wired through the `checkDaysSinceOrder` cron with the correct 90-day cutoff, `['at_risk', 'hibernating']` segment filter, and `getRecentMessageLog` duplicate guard.
4. VIP flow triggers on champion segment transition and executes both email and Shopify tag mutation.
5. Historical data exclusion is enforced at the emission point (orders/create only) and in the cart cancellation check.
6. The automation list page is a real Server Component with full table rendering, not a placeholder.

---

_Verified: 2026-02-19T14:25:37Z_
_Verifier: Claude (gsd-verifier)_
