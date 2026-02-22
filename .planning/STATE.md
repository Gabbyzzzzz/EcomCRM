# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Shopify customers auto-segmented by RFM score, with triggered email flows that actually fire — a full CRM loop that Shopify, Klaviyo, and HubSpot each only half-solve.
**Current focus:** v2.0 milestone defined — ready to plan Phase 12 (Open & Click Tracking)

## Current Position

Phase: 11 of 20 (UI Polish — complete, v1.1 shipped)
Status: v1.1 milestone complete and archived. v2.0 roadmap + requirements defined. Ready to plan Phase 12.
Last activity: 2026-02-22 — v2.0/v3.0 roadmap discussed and finalized

Progress: [█████████████░░░░░░░] 55% (11/20 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 20
- Average duration: 3.8 min
- Total execution time: 0.57 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2/2 | 6 min | 3 min |
| 02-shopify-integration | 5/5 | 18 min | 3.6 min |
| 03-rfm-engine | 2/2 | 6 min | 3 min |
| 04-email-infrastructure | 2/2 | 9 min | 4.5 min |
| 05-automation-engine | 2/2 | 7 min | 3.5 min |
| 06-dashboard-and-customer-ui | 3/3 | 17 min | 5.7 min |
| 07-ai-insights | 2/2 | 5 min | 2.5 min |
| 08-pipeline-verification-and-toggle-fix | 2/2 | 6 min | 3 min |

**Recent Trend:**
- Last 5 plans: 06-03 (4 min), 07-01 (3 min), 07-02 (2 min), 08-01 (4 min), 08-02 (2 min)
- Trend: Stable — v1.0 complete, v1.1 Phase 8 complete

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 08-01]: REST webhook normalization at Inngest boundary — normalizeRestOrder/normalizeRestCustomer convert Shopify REST payload (snake_case, numeric IDs) to internal GraphQL-format types including GID conversion for customer/order IDs
- [Phase 08-01]: days_since_order test-trigger uses direct invocation (fetchEnabledAutomationsByTrigger + executeEmailAction) not Inngest event — trigger is cron-driven with no event name
- [Phase 08-02]: PATCH endpoint uses write-then-read pattern — after setAutomationEnabled, SELECT row back and return { ok: true, automation: { id, enabled } } confirming actual DB state
- [Phase 08-02]: Badge text is 'Inactive' (not 'Disabled') for disabled automations on both list and detail pages
- [Phase 07-ai-insights]: params typed as Promise<{ id: string }> in API route and detail page — Next.js 15 async params convention
- [Phase 07-ai-insights]: Provider factory getModel() selects google('gemini-1.5-flash') by default, anthropic('claude-sonnet-4-20250514') when AI_PROVIDER=anthropic
- [Phase 05-automation-engine]: Automations page at (dashboard)/automations/page.tsx to inherit dashboard sidebar layout via Next.js route group
- [Phase 05-automation-engine]: Inline segment filter in checkDaysSinceOrder step.run to avoid JsonifyObject type incompatibility

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 8: 08-01 pipeline normalization applied — Shopify REST webhook payloads now normalized to GID format before DB lookup. Verify with real webhook that first_order automation fires correctly.
- Phase 2: Shopify `bulkOperationRunQuery` async model (unresolved from v1.0 — lower priority now sync is working)

## Session Continuity

Last session: 2026-02-21
Stopped at: 08-02 complete (75ec87c) — badge text fix and toggle persistence verified by user
Resume file: None
