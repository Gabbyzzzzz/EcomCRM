# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Shopify customers auto-segmented by RFM score, with triggered email flows that actually fire — a full CRM loop that Shopify, Klaviyo, and HubSpot each only half-solve.
**Current focus:** v2.0 complete — planning v3.0 Public App + Multi-Tenant (Phases 16-20)

## Current Position

Phase: 15 complete — v2.0 milestone archived
Status: v2.0 shipped — email tracking, Unlayer editor, template library, 3-tier fallback, performance dashboard all complete.
Last activity: 2026-02-22 — v2.0 milestone archived (phases 12-15)

Progress: [████████████████░░░░] 75% (15/20 phases complete, v2.0 done, v3.0 planned)

## Performance Metrics

**Velocity:**
- Total plans completed: 27 (18 v1.0 + 8 v1.1 + 9 v2.0... wait, 2+5+2+2+2+3+2 = 18 v1.0; 2+3+1+2 = 8 v1.1; 2+3+2+2 = 9 v2.0)
- Average duration: ~3.5 min/plan
- Total phases: 15 complete

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
| 09-configuration-and-email-customization-ui | 3/3 | ~9 min | 3 min |
| 10-test-send | 1/1 | ~3 min | 3 min |
| 11-ui-polish | 2/2 | ~6 min | 3 min |
| 12-open-and-click-tracking | 2/2 | 4 min | 2 min |
| 13-email-template-editor | 3/3 | 9 min | 3 min |
| 14-template-automation-linking | 2/2 | 8 min | 4 min |
| 15-email-performance-dashboard | 2/2 | 4 min | 2 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Key decisions from v2.0 (Phases 12-15):
- Best-effort tracking endpoints (try/catch, never throw) — tracking never breaks email delivery
- MessageLog pre-inserted before Resend call — messageLogId needed for pixel + link rewrite URLs
- email_clicks records every click; messageLogs.clicked_at is first-click only (isNull guard)
- 3-tier template fallback: customTemplateHtml > linkedEmailTemplateId HTML > React Email (never fails)
- Unlayer engine pinned to v1.157.0 — registerCallback image only works on free tier with pinned version
- getAutomationListWithRates uses LEFT JOIN subquery — avoids N+1 per-row stats calls
- Automation list shows "—" for 0-send flows (not "0%") — distinguishes no-data from actual 0%

### Pending Todos

None.

### Blockers/Concerns

- Phase 8: 08-01 pipeline normalization applied — Shopify REST webhook payloads now normalized to GID format before DB lookup. Verify with real webhook that first_order automation fires correctly.
- Phase 2: Shopify `bulkOperationRunQuery` async model (unresolved from v1.0 — lower priority now sync is working)

## Session Continuity

Last session: 2026-02-22
Stopped at: v2.0 milestone archived — all phases 12-15 complete, ROADMAP/PROJECT/MILESTONES updated.
Resume file: None
Next: `/gsd:new-milestone` to define v3.0 requirements and roadmap (Phases 16-20)
