# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Shopify customers auto-segmented by RFM score, with triggered email flows that actually fire — a full CRM loop that Shopify, Klaviyo, and HubSpot each only half-solve.
**Current focus:** Phase 8 — Pipeline Verification and Toggle Fix (v1.1 start)

## Current Position

Phase: 8 of 11 (Pipeline Verification and Toggle Fix)
Plan: 0 of 2 in current phase
Status: Ready to plan
Last activity: 2026-02-21 — v1.1 roadmap created (phases 8-11 defined)

Progress: [███████░░░░] 64% (7/11 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 18
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

**Recent Trend:**
- Last 5 plans: 06-01 (8 min), 06-02 (5 min), 06-03 (4 min), 07-01 (3 min), 07-02 (2 min)
- Trend: Stable — all v1.0 phases complete, v1.1 starting

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 07-ai-insights]: params typed as Promise<{ id: string }> in API route and detail page — Next.js 15 async params convention
- [Phase 07-ai-insights]: Provider factory getModel() selects google('gemini-1.5-flash') by default, anthropic('claude-sonnet-4-20250514') when AI_PROVIDER=anthropic
- [Phase 05-automation-engine]: Automations page at (dashboard)/automations/page.tsx to inherit dashboard sidebar layout via Next.js route group
- [Phase 05-automation-engine]: Inline segment filter in checkDaysSinceOrder step.run to avoid JsonifyObject type incompatibility

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 8: Automation pipeline end-to-end has not been verified with real Shopify data — this is the first thing to debug
- Phase 8: Automation toggle PATCH endpoint may not persist `enabled` field to DB (recent fix commit 31c5b27 addressed async params; verify DB write is correct)
- Phase 2: Shopify `bulkOperationRunQuery` async model (unresolved from v1.0 — lower priority now sync is working)

## Session Continuity

Last session: 2026-02-21
Stopped at: v1.1 roadmap created — ready to plan Phase 8
Resume file: None
