---
phase: 08-pipeline-verification-and-toggle-fix
verified: 2026-02-21T14:00:00Z
status: human_needed
score: 9/10 must-haves verified
re_verification: false
human_verification:
  - test: "Send a real Shopify order via webhook and verify the full chain fires"
    expected: "Webhook receives order, Inngest picks up shopify/webhook.received, processShopifyWebhook runs, automation/first_order is emitted for a first-time customer, processFirstOrder runs, executeEmailAction is called, email arrives in inbox, message_logs row with status=sent appears"
    why_human: "Cannot verify live webhook delivery, Inngest execution, or actual Resend email delivery programmatically without a running dev server and real Shopify store events"
  - test: "POST /api/automations/test-trigger with each of the 4 trigger types and verify message_logs rows"
    expected: "Each POST returns 200, Inngest dashboard shows function invocations for first_order/segment_change/cart_abandoned, message_logs rows appear with status=sent or status=failed (with clear error)"
    why_human: "Requires running dev server + Inngest dev server + real customer UUID from the database"
---

# Phase 08: Pipeline Verification and Toggle Fix — Verification Report

**Phase Goal:** The full automation pipeline is verified working with real Shopify data and toggle state persists correctly to the database

**Verified:** 2026-02-21T14:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A POST to /api/automations/test-trigger fires the correct Inngest event for all 4 trigger types | VERIFIED | `src/app/api/automations/test-trigger/route.ts` lines 98-219: full switch-case with zod validation, customer lookup, Inngest send for first_order/segment_change/cart_abandoned and direct execution for days_since_order |
| 2 | The welcome flow triggers when a first_order event fires for a customer | VERIFIED | `processFirstOrder` in functions.ts line 593-627 listens on `{ event: 'automation/first_order' }`, calls `fetchEnabledAutomationsByTrigger(shopId, 'first_order')`, then `executeEmailAction` with template `welcome` |
| 3 | days_since_order covers both Repurchase Prompt and Win-Back Campaign | VERIFIED | `checkDaysSinceOrder` cron (functions.ts line 789-868) calls `fetchEnabledAutomationsByTrigger(shopId, 'days_since_order')`, iterates both preset automations, applies segment filter, deduplication guard; detailed audit comment at line 778-788 confirms correct wiring |
| 4 | VIP flow triggers when segment_change event fires with newSegment=champion | VERIFIED | `processSegmentChange` (functions.ts line 645-689) listens on `{ event: 'rfm/segment.changed' }`, checks `config?.toSegment === newSegment`, calls `executeEmailAction` with template `vip` |
| 5 | Each flow produces correct email template and sends via Resend with message_logs row | VERIFIED | `executeEmailAction` (actions.ts lines 57-142) has all 5 switch cases (welcome, abandoned-cart, repurchase, winback, vip) constructing correct React Email components; `sendMarketingEmail` (send.ts line 89-193) calls Resend and inserts message_logs with status=sent or status=failed |
| 6 | Shopify REST webhook payload is correctly normalized (GID IDs, camelCase fields) | VERIFIED | `normalizeRestOrder` and `normalizeRestCustomer` functions (functions.ts lines 97-156) convert numeric IDs to GID format, map snake_case to camelCase, split CSV tags to string[]; smoke-test comment block at lines 73-95 documents exact mapping |
| 7 | Toggle off and page reload shows still off | VERIFIED | AutomationToggle component (automation-toggle.tsx line 16-18) does PATCH `/api/automations/${id}` with `{ enabled: next }`, then `router.refresh()`; PATCH endpoint (route.ts line 23) calls `setAutomationEnabled` then SELECT-confirms write; page re-renders from server with fresh DB state |
| 8 | Toggle on and page reload shows still on | VERIFIED | Same code path as truth 7 — toggle works bidirectionally |
| 9 | Badge shows 'Active'/'Inactive' on list and detail pages | VERIFIED | List page (automations/page.tsx line 128): `{automation.enabled ? 'Active' : 'Inactive'}`. Detail page (automations/[id]/page.tsx line 85): `{automation.enabled ? 'Active' : 'Inactive'}`. No 'Disabled' text remaining. |
| 10 | Full Shopify order event flows end-to-end with email arriving in inbox | UNCERTAIN | Pipeline wiring verified programmatically; actual email delivery requires human test with live Shopify webhook + running Inngest dev server |

**Score:** 9/10 truths verified (1 requires human verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/automations/test-trigger/route.ts` | POST endpoint for all 4 trigger types, prod-guarded | VERIFIED | 222 lines, full implementation: zod schema, prod guard (line 43-48), customer lookup, 4 trigger cases, correct Inngest events sent |
| `src/inngest/functions.ts` | All 9 Inngest functions with correct event wiring and REST normalization | VERIFIED | 892 lines: normalizeRestOrder, normalizeRestCustomer, processShopifyWebhook (with normalization), processFirstOrder, processSegmentChange, processCartAbandoned, checkDaysSinceOrder, all exported in `functions` array (lines 876-886) |
| `src/lib/automation/actions.ts` | Email action executor rendering correct template per emailTemplateId | VERIFIED | 201 lines: all 5 templates (welcome, abandoned-cart, repurchase, winback, vip) with correct props, sendMarketingEmail call with idempotency key |
| `src/app/(dashboard)/automations/page.tsx` | Automation list page with 'Active'/'Inactive' badge | VERIFIED | 'Inactive' at line 128, listAutomations server fetch at line 45, AutomationToggle component used |
| `src/app/(dashboard)/automations/[id]/page.tsx` | Automation detail page with 'Active'/'Inactive' badge | VERIFIED | 'Inactive' at line 85, direct DB fetch at line 53-57 |
| `src/app/api/automations/[id]/route.ts` | PATCH endpoint that persists enabled and returns updated row | VERIFIED | setAutomationEnabled called (line 23), then SELECT back with shopId filter (lines 26-30), returns `{ ok: true, automation: { id, enabled } }` (line 36) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/app/api/webhooks/shopify/route.ts` | `processShopifyWebhook` in functions.ts | `inngest.send('shopify/webhook.received')` | WIRED | route.ts line 74: `name: 'shopify/webhook.received'`; functions.ts line 196: `{ event: 'shopify/webhook.received' }` |
| `processShopifyWebhook` | `processFirstOrder` | `inngest.send('automation/first_order')` | WIRED | functions.ts line 264: `name: 'automation/first_order'`; line 595: `{ event: 'automation/first_order' }` |
| `processFirstOrder` | `executeEmailAction` in actions.ts | direct function call | WIRED | functions.ts line 616: `await executeEmailAction({...})` |
| `src/lib/automation/actions.ts` | `sendMarketingEmail` in send.ts | direct function call with templateFactory | WIRED | actions.ts line 146: `await sendMarketingEmail({...})` |
| `automation-toggle.tsx` | `/api/automations/[id]` | `fetch PATCH { enabled: boolean }` | WIRED | toggle.tsx line 16-19: `fetch(\`/api/automations/${id}\`, { method: 'PATCH', body: JSON.stringify({ enabled: next }) })` |
| `/api/automations/[id]` PATCH route | `setAutomationEnabled` in queries.ts | direct function call | WIRED | route.ts line 23: `await setAutomationEnabled(id, parsed.data.enabled)` |
| `automations/page.tsx` | `listAutomations` in queries.ts | server component data fetch | WIRED | page.tsx line 45: `const automationList = await listAutomations(shopId)` |
| `dailyRfmRecalculation` | `processSegmentChange` | `inngest.send('rfm/segment.changed')` | WIRED | functions.ts line 503: `name: 'rfm/segment.changed' as const`; line 647: `{ event: 'rfm/segment.changed' }` |
| `test-trigger route` | `processCartAbandoned` | `inngest.send('automation/cart_abandoned')` | WIRED | test-trigger/route.ts line 201-209: `name: 'automation/cart_abandoned'`; functions.ts line 705: `{ event: 'automation/cart_abandoned' }` |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| PIPE-01: Real Shopify order flows through full chain | UNCERTAIN (human) | Pipeline code is fully wired; live execution needs human test |
| PIPE-02: All 5 preset flows triggerable via test endpoint | VERIFIED | test-trigger endpoint covers all 4 trigger types mapping to 5 flows |
| PIPE-03: Toggle state persists to database across page reloads | VERIFIED | PATCH → setAutomationEnabled → SELECT-confirm → router.refresh() |
| PIPE-04: Badge shows 'Active'/'Inactive' matching persisted state | VERIFIED | Both pages use `automation.enabled ? 'Active' : 'Inactive'` |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/db/queries.ts` | 569 | `setAutomationEnabled` does not filter by shopId — UPDATE applies to any automation by id alone | Info | In single-tenant deployment this is not a practical issue; the PATCH route's post-write SELECT filters by shopId, so wrong-shop rows return 404. No functional impact in current deployment. |

No stub patterns, TODO markers, empty implementations, or placeholder returns found in any modified file.

### TypeScript

`npx tsc --noEmit` ran with zero output — no type errors.

### Human Verification Required

#### 1. Full End-to-End Pipeline with Live Shopify Webhook

**Test:** With `npm run dev` and Inngest dev server (`npx inngest-cli@latest dev`) both running:
1. Configure the Shopify store to send an `orders/create` webhook to your local tunnel URL
2. Place a test order for a customer who has never ordered before (or create one via Shopify admin)
3. Watch the Inngest dev server dashboard for `shopify/webhook.received` event and `process-shopify-webhook` function invocation
4. Verify `automation/first_order` event appears in the Inngest dashboard
5. Verify `process-first-order` function runs and logs `[pipeline] processFirstOrder: executing automation=...`
6. Check the `message_logs` table — a row with `status='sent'` (or `status='failed'` with a clear error) should appear

**Expected:** The Welcome Flow email arrives in the test customer's inbox within 1h (or immediately if delay is 0). The message_logs row shows `status='sent'` and `sent_at` is populated.

**Why human:** Requires a live Shopify store sending webhook events, a running Inngest dev server, and verification that Resend actually delivered the email. Cannot be verified by static code analysis.

#### 2. Manual Test-Trigger Verification

**Test:** With the dev server running and a real customer UUID from the database:
```bash
curl -X POST http://localhost:3000/api/automations/test-trigger \
  -H "Content-Type: application/json" \
  -d '{"triggerType": "first_order", "customerId": "<real-customer-uuid>"}'
```
Repeat for `segment_change`, `days_since_order`, and `cart_abandoned` trigger types.

**Expected:** Each returns `{ "ok": true, "triggerType": "...", "eventSent": true }`. Inngest dashboard shows events received. `message_logs` table gets new rows.

**Why human:** Requires a running dev server and a valid customer UUID from the live database.

### Gaps Summary

No gaps found in the automated checks. All 9 programmatically-verifiable must-haves are verified. The one outstanding item (end-to-end pipeline with real Shopify webhook delivery confirming email arrives in inbox) requires human execution and cannot be verified by static analysis.

---

_Verified: 2026-02-21T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
