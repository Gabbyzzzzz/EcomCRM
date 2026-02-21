---
phase: 07-ai-insights
plan: 01
subsystem: ai
tags: [vercel-ai-sdk, gemini, anthropic, claude, customer-insights, api-route]

# Dependency graph
requires:
  - phase: 06-dashboard-and-customer-ui
    provides: "Customer 360 profile page and getCustomerProfile query"
provides:
  - "Vercel AI SDK provider abstraction with Gemini Flash default, Anthropic fallback"
  - "generateCustomerInsight function returning plain-language customer narrative"
  - "generateEmailCopy function returning 3 subject+preview suggestions"
  - "GET /api/customers/[id]/insights endpoint returning AI narrative for a customer"
  - "CustomerAiInsight client component with loading skeleton, insight text, error fallback, and Regenerate button"
  - "Customer 360 profile page updated with AI insight section"
affects: [07-ai-insights, 07-02-PLAN.md, automations, email-copy]

# Tech tracking
tech-stack:
  added:
    - "ai@6.0.94 (Vercel AI SDK core)"
    - "@ai-sdk/google@3.0.30 (Gemini Flash provider)"
    - "@ai-sdk/anthropic@3.0.46 (Claude Sonnet provider)"
  patterns:
    - "Provider factory pattern: getModel() returns google or anthropic model based on AI_PROVIDER env var"
    - "Async AI calls wrapped in try/catch returning fallback strings — errors never propagate to callers"
    - "Client component fetches AI via useEffect + refreshKey counter for Regenerate button"
    - "maxOutputTokens used (not maxTokens) for Vercel AI SDK v4+"

key-files:
  created:
    - src/lib/ai/insights.ts
    - src/app/api/customers/[id]/insights/route.ts
    - src/components/customer-ai-insight.tsx
  modified:
    - src/lib/env.ts
    - .env.local.example
    - src/app/(dashboard)/customers/[id]/page.tsx

key-decisions:
  - "Vercel AI SDK v4 (ai@6.x) uses maxOutputTokens not maxTokens — discovered during typecheck, fixed before commit"
  - "GOOGLE_GENERATIVE_AI_API_KEY is required (primary provider); ANTHROPIC_API_KEY is optional (fallback)"
  - "AI_PROVIDER env var defaults to 'google' — merchant can switch to 'anthropic' without code changes"
  - "generateCustomerInsight returns fallback string on error — profile page never blocked by AI failure"

patterns-established:
  - "getModel() provider factory: centralizes provider selection so all AI functions use the same model without duplication"
  - "Cancelled ref pattern in useEffect: prevents state updates after component unmount during async fetch"

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 7 Plan 01: AI Insights Library and Customer Profile Integration Summary

**Vercel AI SDK provider abstraction with Gemini Flash default, generating per-customer narrative insights loaded asynchronously on the customer 360 profile page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T15:47:20Z
- **Completed:** 2026-02-20T15:50:20Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Installed Vercel AI SDK (ai, @ai-sdk/google, @ai-sdk/anthropic) and configured provider abstraction
- Created `src/lib/ai/insights.ts` with `generateCustomerInsight` (customer narrative) and `generateEmailCopy` (3 subject+body suggestions) — both wrapped in try/catch with graceful fallbacks
- Created `GET /api/customers/[id]/insights` route that computes daysSinceLastOrder and builds CustomerInsightData before calling generateCustomerInsight
- Created `CustomerAiInsight` client component with 3-line skeleton loading state, insight text, error fallback, and Regenerate button
- Integrated AI insight card into customer 360 profile page between Info Cards and Tags Section

## Task Commits

Each task was committed atomically:

1. **Task 1: Install packages, update env, create AI insights library and API endpoint** - `06f09d7` (feat)
2. **Task 2: Customer profile AI insight component integration** - `d5f86d2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/ai/insights.ts` - Vercel AI SDK wrapper with generateCustomerInsight and generateEmailCopy; provider factory getModel() returns google or anthropic based on AI_PROVIDER env var
- `src/app/api/customers/[id]/insights/route.ts` - GET endpoint fetching customer, computing daysSinceLastOrder, building CustomerInsightData, calling generateCustomerInsight
- `src/components/customer-ai-insight.tsx` - Client component with loading skeleton, insight text, error fallback, Regenerate button using refreshKey
- `src/lib/env.ts` - Added GOOGLE_GENERATIVE_AI_API_KEY (required), ANTHROPIC_API_KEY (optional), AI_PROVIDER (default: 'google')
- `.env.local.example` - Added AI Provider section with all three vars documented
- `src/app/(dashboard)/customers/[id]/page.tsx` - Added CustomerAiInsight import and AI insight card between info cards and tags section

## Decisions Made
- **Vercel AI SDK v4 uses `maxOutputTokens`**: Discovered during initial TypeScript check that `maxTokens` is not in the API. Fixed before commit — used `maxOutputTokens: 300` and `maxOutputTokens: 600`. No plan change needed.
- **GOOGLE_GENERATIVE_AI_API_KEY required**: Matches plan spec — Google Gemini is the primary (default) provider. ANTHROPIC_API_KEY is optional for merchants wanting Claude.
- **Provider default is 'google'**: AI_PROVIDER env var defaults to 'google' via Zod `.default('google')` — merchants can switch to Anthropic by setting `AI_PROVIDER=anthropic`.
- **Cancelled ref in useEffect**: Added `cancelled` boolean to prevent state updates after component unmount. Standard pattern for async fetch in React client components.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used maxOutputTokens instead of maxTokens**
- **Found during:** Task 1 (TypeScript check after writing insights.ts)
- **Issue:** Vercel AI SDK v4 (ai@6.x) does not have `maxTokens` in the `generateText` options type — only `maxOutputTokens`
- **Fix:** Replaced `maxTokens: 300` with `maxOutputTokens: 300` and `maxTokens: 600` with `maxOutputTokens: 600`
- **Files modified:** `src/lib/ai/insights.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 06f09d7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - API type mismatch)
**Impact on plan:** Minor API rename — no behavior change, no scope creep.

## Issues Encountered
- The `npx tsc` binary returned a MODULE_NOT_FOUND error for `../lib/tsc.js`. Resolved by invoking TypeScript directly via `node .../node_modules/typescript/lib/tsc.js --noEmit`. This is a Node.js v25 shebang compatibility issue with the local binary symlink — not a project code issue.

## User Setup Required
**New environment variables required before AI insights will work:**

Add to `.env.local`:
```
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-api-key
# Optional — only needed if switching to Anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key
AI_PROVIDER=google
```

Get Google AI API key at: https://aistudio.google.com/app/apikey

## Next Phase Readiness
- AI insights library ready for Phase 07-02 (email copy generation in automation builder)
- `generateEmailCopy` already implemented and exported — 07-02 can import directly
- Customer 360 profile now shows AI narrative asynchronously — profile page never blocked by AI latency

---
*Phase: 07-ai-insights*
*Completed: 2026-02-20*

## Self-Check: PASSED
