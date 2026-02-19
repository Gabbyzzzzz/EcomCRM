---
phase: 04-email-infrastructure
plan: 02
subsystem: email
tags: [resend, webhooks, unsubscribe, compliance, inngest, shopify-tags, suppression]

requires:
  - phase: 04-01
    provides: verifyUnsubscribeToken, insertSuppression, removeSuppression, setMarketingOptedOut, getCustomerByEmail, getCustomerByInternalId

provides:
  - POST /api/webhooks/resend — Resend bounce/complaint webhook endpoint dispatching to Inngest
  - GET /api/unsubscribe — redirect-based unsubscribe (email link click)
  - POST /api/unsubscribe — one-click unsubscribe (RFC 8058) + resubscribe/undo
  - /unsubscribe page — confirmation with undo form (Server Component)
  - processResendWebhook Inngest function — hard bounce suppression, complaint opt-out
  - Shopify 'unsubscribed' tag sync on unsubscribe/resubscribe via tagsAdd/tagsRemove mutations

affects:
  - 05-automation-engine (sendMarketingEmail suppression gate now fully populated by bounce + unsubscribe flows)

tech-stack:
  added: []
  patterns:
    - "Resend webhook dispatches to Inngest via inngest.send (same pattern as Shopify webhooks)"
    - "Single /api/unsubscribe route handles 3 flows: GET link-click, POST one-click (RFC 8058), POST resubscribe"
    - "Shopify tag sync (tagsAdd/tagsRemove) is best-effort: logged but does not block unsubscribe success"
    - "Unsubscribe page is a Server Component with standard HTML form POST for undo — no client JS"

key-files:
  created:
    - src/app/api/webhooks/resend/route.ts
    - src/app/api/unsubscribe/route.ts
    - src/app/unsubscribe/page.tsx
  modified:
    - src/inngest/functions.ts

key-decisions:
  - "Single /api/unsubscribe route for all 3 flows (GET, POST one-click, POST resubscribe) — cleaner than 3 separate routes"
  - "Shopify tag sync is best-effort (try/catch log) — network errors must not block unsubscribe compliance action"
  - "Unsubscribe page uses Server Component with standard HTML form — no client-side JS dependency for public compliance page"
  - "svix webhook verification noted as TODO — accepted known gap per plan spec"
  - "Soft bounces intentionally not suppressed — per locked architectural decision from plan spec"

metrics:
  duration: 3min
  completed: 2026-02-19
  tasks: 2
  files_created: 3
  files_modified: 1
---

# Phase 04 Plan 02: Email Compliance Endpoints Summary

**Resend bounce webhook, RFC 8058 one-click unsubscribe, Shopify tag sync, and unsubscribe confirmation page with undo — closing the email compliance loop**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T13:17:17Z
- **Completed:** 2026-02-19T13:20:00Z
- **Tasks:** 2
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- Full email compliance loop: bounces suppress, complaints opt-out, link clicks unsubscribe, one-click unsubscribe works, undo re-subscribes
- POST /api/webhooks/resend receives email.bounced (hard only) and email.complained events from Resend, dispatches to Inngest with Zod validation
- processResendWebhook Inngest function: hard bounce -> insertSuppression('hard_bounce') + setMarketingOptedOut; spam complaint -> insertSuppression('unsubscribe') + setMarketingOptedOut; soft bounces intentionally ignored
- Single /api/unsubscribe route handles GET (link click redirect), POST one-click (RFC 8058 List-Unsubscribe-Post), and POST resubscribe flows in one file
- Shopify 'unsubscribed' tag sync via tagsAdd mutation on unsubscribe, tagsRemove on resubscribe
- /unsubscribe Server Component page shows 4 states: unsubscribed+undo form, re-subscribed, error, fallback

## Task Commits

1. **Task 1: Resend webhook + unsubscribe API + processResendWebhook** - `4b9fe39` (feat)
2. **Task 2: Unsubscribe confirmation page** - `f525c52` (feat)

## Files Created/Modified

- `src/app/api/webhooks/resend/route.ts` - POST handler validating Resend payloads with Zod and dispatching to Inngest
- `src/app/api/unsubscribe/route.ts` - GET (link click), POST one-click (RFC 8058), POST resubscribe all in one route
- `src/app/unsubscribe/page.tsx` - Server Component confirmation page with undo form (done, resubscribed, error, fallback states)
- `src/inngest/functions.ts` - Added processResendWebhook function + updated functions array to 5 entries

## Decisions Made

- **Single /api/unsubscribe route:** All three flows (GET link-click, POST one-click, POST resubscribe) live in one route.ts — distinguished by HTTP method and form body content. Cleaner than 3 separate routes.
- **Best-effort Shopify tag sync:** tagsAdd/tagsRemove wrapped in try/catch — tag sync failure must not block the compliance opt-out action. Error logged only.
- **Server Component unsubscribe page:** Public-facing compliance page requires no interactivity beyond a form POST — no client JS needed, simpler and faster.
- **Soft bounces not suppressed:** Per locked plan decision — soft bounces are transient delivery failures, not permanent addresses. Only hard bounces warrant suppression.
- **svix TODO documented:** Per plan spec, svix verification is an accepted known gap. Comment added at top of webhook route.

## Deviations from Plan

None — plan executed exactly as written.

## Compliance Requirements Met

- **EMAIL-01:** Resend webhook fires on complaint -> customer.marketing_opted_out = true immediately via Inngest
- **EMAIL-01 (link):** GET /api/unsubscribe link click -> marketing_opted_out = true + suppression + Shopify tag
- **EMAIL-02:** Satisfied by Plan 01's send wrapper gating on marketing_opted_out (unchanged)
- **EMAIL-03:** Hard bounce -> suppression table -> future sendMarketingEmail calls return suppressed
- **EMAIL-04:** Subdomain DNS documented in .env.local.example (manual setup per user_setup)
- **EMAIL-05:** RFC 8058 one-click unsubscribe via List-Unsubscribe-Post header + POST /api/unsubscribe?token=xxx

## Self-Check: PASSED

Files verified:
- [x] src/app/api/webhooks/resend/route.ts — created
- [x] src/app/api/unsubscribe/route.ts — created
- [x] src/app/unsubscribe/page.tsx — created
- [x] src/inngest/functions.ts — modified (5 functions in array)

Commits verified:
- [x] 4b9fe39 — Task 1
- [x] f525c52 — Task 2

Build verified: `npm run build` succeeds, all 3 new routes visible in build output.
