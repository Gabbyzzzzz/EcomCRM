# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Shopify customers auto-segmented by RFM score, with triggered email flows that actually fire — a full CRM loop that Shopify, Klaviyo, and HubSpot each only half-solve.
**Current focus:** Phase 14 complete (2/2 plans done — template linking + inline editor with merge tags)

## Current Position

Phase: 15 of 20 (Email Performance Dashboard — in progress, 1/1 plans done)
Status: Phase 15 Plan 01 complete — aggregate email KPIs on dashboard (total sent, open rate, click rate), open/click rate columns on automation list.
Last activity: 2026-02-22 — Phase 15 Plan 01 executed (email performance dashboard)

Progress: [████████████████░░░░] 75% (15/20 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 21
- Average duration: 3.8 min
- Total execution time: 0.64 hours

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

| 12-open-and-click-tracking | 2/2 | 4 min | 2 min |
| 13-email-template-editor | 3/3 | 9 min | 3 min |
| 14-template-automation-linking | 2/2 | 8 min | 4 min |
| 15-email-performance-dashboard | 1/1 | 2 min | 2 min |

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
- [Phase 12-01]: email_clicks records every click; messageLogs.clicked_at is first-click only via isNull() guard
- [Phase 12-01]: Tracking endpoints are best-effort (try/catch, never throw) — tracking should never break email delivery
- [Phase 12-02]: MessageLog pre-inserted before Resend call so messageLogId is available for tracking URLs; on failure UPDATE pre-inserted row (no second INSERT)
- [Phase 12-02]: Unsubscribe links skipped by rewriteLinks via url.includes('/unsubscribe') — compliance requirement
- [Phase 13]: drizzle-kit push bug workaround: applied migration directly via postgres.js client (drizzle-kit push fails with TypeError on pg_check constraints)
- [Phase 13]: Duplicate action uses POST /api/email-templates/[id]?action=duplicate — keeps route structure simple for single action
- [Phase 13]: _components/ subdirectory pattern: client components collocated with their server-component page under emails/_components/
- [Phase 13]: Unlayer engine pinned to version 1.157.0 — registerCallback image only works on free tier with pinned version
- [Phase 13]: Image upload API uses service-role Supabase key (server-side only) for email-assets bucket uploads
- [Phase 13]: seed:templates script uses tsx --env-file .env.local — zero-config, loads .env.local without extra deps
- [Phase 13]: Preset seeding uses pre-query + existingNames Set for idempotency, not onConflictDoNothing — email_templates has no unique(shopId, name) constraint
- [Phase 14-01]: 3-tier template fallback: customTemplateHtml (Tier 1) > linkedEmailTemplateId HTML (Tier 2) > React Email switch (Tier 3, always succeeds)
- [Phase 14-01]: rawHtml added to SendMarketingEmailParams — skips React Email render for Tier 1/2 sends while preserving tracking pixel + link rewriting
- [Phase 14-01]: substituteVariables() exported from actions.ts and imported by preview/route.ts for shared {{variable}} replacement logic
- [Phase 14-01]: Template selector saves linkedEmailTemplateId with form changes on Save (not immediate PATCH) for UX consistency
- [Phase 14-02]: AutomationInlineEditor is inline (500px) not fullscreen — visually embedded in automation detail page below template selector
- [Phase 14-02]: substituteVariables fallback changed from match to empty string — prevents literal merge tags appearing in sent emails
- [Phase 14-02]: Customize for this Flow fetches linked template designJson on demand via GET /api/email-templates/[id] — not pre-loaded
- [Phase 15-01]: getAutomationListWithRates uses LEFT JOIN subquery (db.execute) rather than N+1 per-row getAutomationEmailStats calls for automation list
- [Phase 15-01]: Automation list shows "—" when rate is 0 (no sends) rather than "0%" — cleaner UX distinguishing no-data from actual 0% rate
- [Phase 15-01]: Email Performance section placed inside kpis.totalCustomers > 0 branch — consistent with all other dashboard data sections

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 8: 08-01 pipeline normalization applied — Shopify REST webhook payloads now normalized to GID format before DB lookup. Verify with real webhook that first_order automation fires correctly.
- Phase 2: Shopify `bulkOperationRunQuery` async model (unresolved from v1.0 — lower priority now sync is working)

## Session Continuity

Last session: 2026-02-22
Stopped at: 15-01 complete (82d3b03) — email performance KPIs on dashboard, open/click rate columns on automation list
Resume file: None
