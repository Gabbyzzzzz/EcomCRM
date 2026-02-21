---
phase: 04-email-infrastructure
plan: 01
subsystem: email
tags: [resend, react-email, drizzle, suppression, compliance, hmac, unsubscribe]

requires:
  - phase: 01-foundation
    provides: env.ts, Drizzle schema baseline, db client
  - phase: 02-shopify-integration
    provides: customers table, messageLogs table, shop_id pattern
  - phase: 03-rfm-engine
    provides: customer segment and lifecycle data used by email automation

provides:
  - 5 React Email templates (welcome, abandoned-cart, repurchase, winback, vip) with consistent branding
  - sendMarketingEmail() function with compliance headers, suppression gate, idempotency
  - HMAC-signed unsubscribe token utility (generateUnsubscribeToken, verifyUnsubscribeToken, buildUnsubscribeUrl)
  - suppressions table with shop-scoped unique index on (shopId, email)
  - marketingOptedOut boolean column on customers table
  - suppressed/failed statuses added to messageStatusEnum
  - checkSuppression, insertSuppression, removeSuppression, setMarketingOptedOut, getCustomerByInternalId, getCustomerByEmail query functions
  - RESEND_FROM_NAME, RESEND_FROM_EMAIL, RESEND_REPLY_TO, APP_URL env vars with safe defaults

affects:
  - 04-02 (unsubscribe webhook page — depends on verifyUnsubscribeToken, insertSuppression, setMarketingOptedOut)
  - 05-automation-engine (calls sendMarketingEmail with templateFactory pattern)
  - future bounce handling (uses insertSuppression, getCustomerByEmail)

tech-stack:
  added: []
  patterns:
    - "templateFactory pattern: sendMarketingEmail accepts (unsubscribeUrl: string) => ReactElement factory, not pre-instantiated element — guarantees header URL == body URL"
    - "HMAC-signed tokens for unsubscribe links using SHOPIFY_CLIENT_SECRET as signing key"
    - "Suppression gate: checkSuppression + marketingOptedOut check before every send, failures logged not thrown"
    - "Non-fatal email errors: all failures return SendResult, never throw — email errors are non-fatal per architecture"
    - "Resend idempotencyKey passed as second argument to resend.emails.send(options, { idempotencyKey })"

key-files:
  created:
    - src/lib/email/send.ts
    - src/lib/email/unsubscribe.ts
    - src/emails/welcome.tsx
    - src/emails/abandoned-cart.tsx
    - src/emails/repurchase.tsx
    - src/emails/winback.tsx
    - src/emails/vip.tsx
    - drizzle/0003_naive_masque.sql
  modified:
    - src/lib/db/schema.ts
    - src/lib/env.ts
    - src/lib/db/queries.ts
    - .env.local.example
    - README.md

key-decisions:
  - "templateFactory pattern (not pre-instantiated ReactElement): ensures List-Unsubscribe header URL is always identical to the URL in the email body"
  - "SHOPIFY_CLIENT_SECRET as HMAC signing key for unsubscribe tokens — no new secret needed, key is already scoped to shop"
  - "Unsubscribe tokens do not expire — links in sent emails must always work regardless of age"
  - "All send failures return SendResult { sent: false, reason } and log to MessageLog — never thrown — email errors are non-fatal"
  - "suppressions table unique index on (shopId, email) enables safe onConflictDoNothing inserts"
  - "Resend idempotencyKey passed as second argument: resend.emails.send(options, { idempotencyKey }) per SDK v6+ API"

patterns-established:
  - "Email send always goes through sendMarketingEmail — never call resend.emails.send() directly"
  - "All email templates export default component with PreviewProps for React Email dev preview"
  - "Consistent branding: #2563eb primary, #1f2937 text, #6b7280 muted, #f9fafb background, 600px max-width"

duration: 6min
completed: 2026-02-19
---

# Phase 04 Plan 01: Email Infrastructure (Send Layer) Summary

**Resend-backed email send wrapper with templateFactory compliance pattern, 5 React Email templates, HMAC unsubscribe tokens, and suppression/opt-out gate backed by a new suppressions table**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-19T13:07:40Z
- **Completed:** 2026-02-19T13:14:16Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Full email send infrastructure: suppression gate, compliance headers (List-Unsubscribe + List-Unsubscribe-Post), idempotency key forwarding to Resend
- 5 production-ready React Email templates (welcome, abandoned-cart, repurchase, winback, vip) with consistent branding and unsubscribe footer
- HMAC-SHA256 unsubscribe token utility with base64url encoding — signed with SHOPIFY_CLIENT_SECRET, no new secret needed
- Schema extensions: suppressions table, marketingOptedOut column on customers, suppressed/failed enum values, Drizzle migration 0003

## Task Commits

1. **Task 1: Schema extensions, env vars, suppression queries, unsubscribe utility, DNS docs** - `78e65db` (feat)
2. **Task 2: React Email templates + Resend send wrapper** - `fe21c6b` (feat)

## Files Created/Modified
- `src/lib/email/send.ts` - sendMarketingEmail() with suppression gate, List-Unsubscribe headers, idempotency, templateFactory pattern
- `src/lib/email/unsubscribe.ts` - generateUnsubscribeToken, verifyUnsubscribeToken, buildUnsubscribeUrl using HMAC-SHA256
- `src/emails/welcome.tsx` - Welcome email React component
- `src/emails/abandoned-cart.tsx` - Abandoned cart email with cart item list
- `src/emails/repurchase.tsx` - Repurchase reminder with product suggestions
- `src/emails/winback.tsx` - Win-back email with optional incentive display
- `src/emails/vip.tsx` - VIP recognition email with stats and perks list
- `src/lib/db/schema.ts` - Added suppressionReasonEnum, suppressions table, marketingOptedOut column, suppressed/failed statuses
- `src/lib/env.ts` - Added RESEND_FROM_NAME, RESEND_FROM_EMAIL, RESEND_REPLY_TO, APP_URL with safe defaults
- `src/lib/db/queries.ts` - Added checkSuppression, insertSuppression, removeSuppression, setMarketingOptedOut, getCustomerByInternalId, getCustomerByEmail
- `drizzle/0003_naive_masque.sql` - Migration: CREATE TYPE suppression_reason, ADD VALUE suppressed/failed to message_status, CREATE TABLE suppressions, ADD COLUMN marketing_opted_out
- `.env.local.example` - Email sending config section + DNS setup comments
- `README.md` - Email Sending Setup section with SPF/DKIM/DMARC checklist and Resend domain verification link

## Decisions Made
- **templateFactory pattern:** sendMarketingEmail takes `(unsubscribeUrl: string) => ReactElement` factory, not a pre-rendered element — this guarantees the URL in the `List-Unsubscribe` header and the URL in the email body are always identical
- **SHOPIFY_CLIENT_SECRET as HMAC key:** No new secret variable needed; the existing client secret is already shop-scoped and secret
- **Non-expiring unsubscribe tokens:** Once an email is sent, the unsubscribe link must always work; expiring tokens would create compliance risk
- **Non-fatal email errors:** All failures return a structured `SendResult`, never throw — automation engine should not crash on email delivery failure
- **Resend SDK idempotency:** `resend.emails.send(options, { idempotencyKey })` — second argument pattern per SDK v6+

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed style variable name collision in repurchase.tsx**
- **Found during:** Task 2 (React Email templates)
- **Issue:** Style constant named `lastOrderDate` conflicted with the prop also named `lastOrderDate` — TypeScript reported "Type 'string' has no properties in common with type 'CSSProperties'"
- **Fix:** Renamed style constant to `lastOrderDateStyle`
- **Files modified:** src/emails/repurchase.tsx
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** fe21c6b (Task 2 commit)

**2. [Rule 1 - Bug] Fixed number-in-Preview children type error in winback.tsx**
- **Found during:** Task 2 (React Email templates)
- **Issue:** `{daysSinceLastOrder}` (number) passed directly as JSX children inside `<Preview>` — TypeScript error "Type 'number' is not assignable to type 'ReactNode & string'"
- **Fix:** Wrapped entire preview string in template literal: `` {`...${daysSinceLastOrder} days`} ``
- **Files modified:** src/emails/winback.tsx
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** fe21c6b (Task 2 commit)

**3. [Rule 3 - Blocking] Pre-existing broken .bin/tsc and .bin/next wrapper scripts**
- **Found during:** Task 1 verification
- **Issue:** Node.js v25.6.1 environment has corrupted `.bin` wrapper scripts — `.bin/tsc` requires `../lib/tsc.js` which resolves incorrectly; same for `.bin/next`
- **Fix:** Ran TypeScript directly via `node node_modules/typescript/bin/tsc --noEmit` and Next.js via `node node_modules/next/dist/bin/next build` — both work correctly
- **Impact:** Pre-existing environment issue, not caused by this plan. Both tsc and build pass when invoked directly.

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking environment issue)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
- Node.js v25 environment has corrupted `.bin` symlink scripts for tsc and next — invoking binaries directly via `node node_modules/...` works correctly. Pre-existing issue not related to this plan.

## User Setup Required
Set these env vars in `.env.local` before sending emails:
- `RESEND_API_KEY` — from resend.com dashboard
- `RESEND_FROM_EMAIL` — verified domain address (e.g. `hello@marketing.your-store.com`)
- `RESEND_FROM_NAME` — display name (defaults to "EcomCRM")
- `RESEND_REPLY_TO` — optional reply-to (omit for noreply)
- `APP_URL` — public deployment URL for unsubscribe links (defaults to `http://localhost:3000`)

Run Drizzle migration (`drizzle/0003_naive_masque.sql`) against production DB before deploying.

## Next Phase Readiness
- Plan 02 can now build: unsubscribe webhook page (uses verifyUnsubscribeToken), Resend bounce webhook (uses insertSuppression + getCustomerByEmail), and opt-in/opt-out API routes (uses setMarketingOptedOut)
- Plan 05 automation engine can call sendMarketingEmail with templateFactory pattern
- All 5 email templates ready for use by automation actions

---
*Phase: 04-email-infrastructure*
*Completed: 2026-02-19*
