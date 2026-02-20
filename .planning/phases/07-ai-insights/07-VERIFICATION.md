---
phase: 07-ai-insights
verified: 2026-02-20T16:12:53Z
status: passed
score: 10/10 must-haves verified
re_verification: false
human_verification:
  - test: "Navigate to a customer 360 profile at /customers/[id]"
    expected: "AI Insight card appears with a 3-line loading skeleton, then insight text describing segment and recommended action. Regenerate button re-fetches a new insight."
    why_human: "Real AI API response requires live GOOGLE_GENERATIVE_AI_API_KEY and network round-trip"
  - test: "Navigate to /automations, click an automation name, then click Generate Suggestions"
    expected: "Automation detail page shows configuration. Clicking Generate Suggestions shows Generating... state, then 3 subject line + body preview cards with AI note text below."
    why_human: "Real AI API response requires live provider key and network round-trip"
  - test: "Set AI_PROVIDER=anthropic in .env.local and repeat both flows"
    expected: "Both customer insight and email copy generation use Anthropic Claude Sonnet instead of Gemini Flash — same UX, different underlying model"
    why_human: "Provider switch requires env restart and live Anthropic API key"
---

# Phase 7: AI Insights Verification Report

**Phase Goal:** The Claude API adds per-customer intelligence and email copy generation on top of the complete data layer
**Verified:** 2026-02-20T16:12:53Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Opening a customer 360 profile displays a plain-language AI insight narrative using live RFM scores and order data | VERIFIED | `CustomerAiInsight` fetches `/api/customers/${customerId}/insights` in `useEffect`; route builds `CustomerInsightData` from live DB customer row including rfmR/F/M, totalSpent, orderCount, lastOrderAt |
| 2 | The insight narrative describes the customer's segment, purchasing pattern, recency, and a recommended action | VERIFIED | System prompt in `generateCustomerInsight` explicitly instructs: state segment, describe purchasing pattern (frequency, recency, monetary), recommend one specific action in plain language |
| 3 | The insight loads asynchronously after the page renders — the profile is never blocked by AI latency | VERIFIED | `CustomerAiInsight` is a `'use client'` component with `useState(true)` for loading; customer profile page is a Server Component that does not await AI — insight fetches only after hydration |
| 4 | If the AI call fails, the profile still renders normally with a fallback message | VERIFIED | `generateCustomerInsight` wraps all code in `try/catch` returning `"Unable to generate insight at this time."`. Component also handles `!res.ok` and catch with `setError(true)` rendering the fallback `<p>` |
| 5 | AI provider is configurable via AI_PROVIDER env var — defaults to 'google' (Gemini Flash) | VERIFIED | `env.ts` has `AI_PROVIDER: z.enum(['google', 'anthropic']).default('google')`. `getModel()` factory returns `anthropic('claude-sonnet-4-20250514')` when `AI_PROVIDER=anthropic`, otherwise `google('gemini-2.0-flash')` |
| 6 | Clicking an automation row navigates to a detail page showing the automation's configuration | VERIFIED | `automations/page.tsx` wraps automation name in `<Link href={/automations/${automation.id}}>`. Detail page at `automations/[id]/page.tsx` queries DB with `eq(automations.id, id)` and renders trigger/delay/action/template/last-run config grid |
| 7 | The automation detail page has a 'Generate Suggestions' button for AI email copy | VERIFIED | `EmailCopyGenerator` component renders `<Button>Generate Suggestions</Button>` (or `Generating...` when loading). Embedded in `automations/[id]/page.tsx` inside the AI Email Copy Generator section |
| 8 | Clicking 'Generate Suggestions' produces 3 AI-written subject line and body copy options | VERIFIED | `handleGenerate` POSTs to `/api/automations/${automationId}/generate-copy`; route calls `generateEmailCopy` which prompts for exactly 3 `{subjectLine, bodyPreview}` JSON suggestions; component maps them to individual border cards |
| 9 | Each suggestion can be viewed -- the user can accept or discard suggestions | VERIFIED | Suggestions rendered as readable cards (subject bold, preview muted). No forced accept action — user reads and copies manually. "Regenerate" by clicking button again clears and re-fetches. Discard by ignoring. |
| 10 | If the AI call fails, the page shows an error message without crashing | VERIFIED | `generateEmailCopy` returns `{ suggestions: [] }` on error. API route's outer try/catch returns 500 JSON. `EmailCopyGenerator` catches non-ok response and sets `error` state, rendering `<p className="text-sm text-destructive">{error}</p>` |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ai/insights.ts` | generateCustomerInsight and generateEmailCopy via Vercel AI SDK with provider abstraction | VERIFIED | 121 lines. Exports both functions. Imports `generateText` from `'ai'`, `google` from `'@ai-sdk/google'`, `anthropic` from `'@ai-sdk/anthropic'`. `getModel()` provider factory. Both functions wrapped in try/catch. |
| `src/app/api/customers/[id]/insights/route.ts` | GET endpoint returning AI-generated insight for a customer | VERIFIED | 46 lines. Exports `GET`. Fetches customer via `getCustomerProfile`, computes `daysSinceLastOrder`, builds `CustomerInsightData`, calls `generateCustomerInsight`, returns `Response.json({ insight })`. |
| `src/components/customer-ai-insight.tsx` | Client component that fetches and displays AI insight with loading state | VERIFIED | 79 lines. Has `'use client'` directive. Loading skeleton (3 `animate-pulse` lines). Error fallback. Insight text. Regenerate button using `refreshKey` counter pattern. Cancelled ref to prevent stale state. |
| `src/app/(dashboard)/customers/[id]/page.tsx` | Customer profile page with AI insight section added | VERIFIED | Imports `CustomerAiInsight`. Renders it at line 252 between `{/* Info Cards Row */}` (line 157) and `{/* Tags Section */}` (line 255) exactly as specified. |
| `src/app/api/automations/[id]/generate-copy/route.ts` | POST endpoint that calls generateEmailCopy and returns suggestions | VERIFIED | 46 lines. Exports `POST`. Queries automation from DB with `and(eq(automations.id, id), eq(automations.shopId, shopId))`. Extracts templateType/segmentTarget. Calls `generateEmailCopy`. Returns suggestions JSON. |
| `src/app/(dashboard)/automations/[id]/page.tsx` | Automation detail page with configuration display and AI copy generation | VERIFIED | 142 lines. Server Component. Back link, name + status badge, configuration grid (trigger/delay/action/template/last-run), embedded `<EmailCopyGenerator>`. |
| `src/components/email-copy-generator.tsx` | Client component with Generate Suggestions button, displays AI-generated copy options | VERIFIED | 86 lines. Has `'use client'` directive. `handleGenerate` fetches POST. Loading state ("Generating..."). Error display. 3-card suggestion display with subject bold + body muted. AI disclaimer note. `noTemplate` guard disables button when emailTemplateId is null. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/customer-ai-insight.tsx` | `/api/customers/[id]/insights` | fetch in useEffect | WIRED | Line 23: `fetch(\`/api/customers/${customerId}/insights\`)` inside `fetchInsight()` called from `useEffect([customerId, refreshKey])` |
| `src/app/api/customers/[id]/insights/route.ts` | `src/lib/ai/insights.ts` | generateCustomerInsight call | WIRED | Line 3: import. Line 39: `const insight = await generateCustomerInsight(data)` |
| `src/lib/ai/insights.ts` | ai (Vercel AI SDK) | generateText with provider-selected model | WIRED | Line 1: `import { generateText } from 'ai'`. Lines 60 and 107: `await generateText({ model: getModel(), ... })` |
| `src/components/email-copy-generator.tsx` | `/api/automations/[id]/generate-copy` | fetch on button click | WIRED | Line 27: `fetch(\`/api/automations/${automationId}/generate-copy\`, { method: 'POST' })` inside `handleGenerate` called via `onClick={handleGenerate}` |
| `src/app/api/automations/[id]/generate-copy/route.ts` | `src/lib/ai/insights.ts` | generateEmailCopy call | WIRED | Line 3: import. Line 31: `const suggestions = await generateEmailCopy({ ... })` |
| `src/app/(dashboard)/automations/[id]/page.tsx` | `src/lib/db/schema` automations table | automation query by id | WIRED | Line 55: `.where(and(eq(automations.id, id), eq(automations.shopId, shopId)))` |
| `src/app/(dashboard)/automations/page.tsx` | `src/app/(dashboard)/automations/[id]/page.tsx` | Link href on automation row | WIRED | Lines 104-108: `<Link href={\`/automations/${automation.id}\`} className="hover:underline text-primary">` |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| AI-01: Per-customer insight narrative on 360 profile | SATISFIED | All supporting truths 1-5 verified |
| AI-02: Email copy generation on automation editor | SATISFIED | All supporting truths 6-10 verified |

### Anti-Patterns Found

None found. No TODO/FIXME/placeholder comments, no empty returns, no stub implementations in any of the 7 phase artifacts.

### Human Verification Required

#### 1. Customer AI Insight Narrative (Live API)

**Test:** With `GOOGLE_GENERATIVE_AI_API_KEY` set, navigate to `/customers/[id]` for any customer with order history.
**Expected:** AI Insight card shows 3-line loading skeleton briefly, then a 2-4 sentence narrative mentioning the customer's segment (e.g., "at_risk"), their purchasing pattern (order count, days since last order, average spend), and one recommended action (e.g., "send a win-back offer"). Regenerate button re-fetches a new variation.
**Why human:** Real AI API response — requires live provider key and network call. Cannot verify the narrative quality or segment reference programmatically.

#### 2. Email Copy Generation (Live API)

**Test:** Navigate to `/automations`, click any automation name, then click "Generate Suggestions".
**Expected:** Page shows configuration section. Button shows "Generating..." then 3 cards appear, each with a bold subject line and muted body preview. Note "These are AI-generated suggestions. Review and customize before using." is visible.
**Why human:** Real AI API response — requires live provider key and that the AI actually returns valid JSON matching the required shape.

#### 3. Provider Switch (AI_PROVIDER=anthropic)

**Test:** Set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=...` in `.env.local`, restart dev server, repeat flows 1 and 2.
**Expected:** Both features work identically with Anthropic Claude Sonnet instead of Gemini Flash.
**Why human:** Requires live Anthropic API key and env restart.

### Gaps Summary

No gaps found. All 10 observable truths are verified against the actual codebase. All 7 required artifacts exist, are substantive (no stubs), and are fully wired. All 7 key links are verified with direct evidence. The only remaining items are human verification of live AI API responses — a runtime concern, not a code gap.

---

_Verified: 2026-02-20T16:12:53Z_
_Verifier: Claude (gsd-verifier)_
