# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Shopify customers auto-segmented by RFM score, with triggered email flows that actually fire — a full CRM loop that Shopify, Klaviyo, and HubSpot each only half-solve.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 7 (Foundation)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-02-19 — Completed 01-01 (Drizzle schema + migrations)

Progress: [█░░░░░░░░░] 7%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 3 min
- Total execution time: 0.05 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 1/2 | 3 min | 3 min |

**Recent Trend:**
- Last 5 plans: 01-01 (3 min)
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Custom App (not Public App): Single store access token in env — no OAuth flow needed
- Inngest for scheduling: Handles retries, idempotency, cron natively — all async work goes through Inngest
- Quintile-based RFM: Must run as PostgreSQL NTILE(5) window function — never in application memory
- Resend + React Email: Two missing packages must be added before Phase 1 is done (`@react-email/render`, `decimal.js`)
- prepare: false on postgres client is mandatory for Supabase Transaction mode pooler (port 6543) — omitting causes "prepared statements are not supported" errors under load
- All pgEnums must be exported with export const at module top level — drizzle-kit silently skips non-exported enums, producing missing CREATE TYPE in migration
- numeric(19,4) used for all money fields (total_spent, avg_order_value, total_price) — never float to avoid precision loss
- shop_id column on every table enables future multi-tenant support without schema migration

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2: Shopify `bulkOperationRunQuery` async model should be verified against current Shopify docs before implementation (research flagged as needs validation)
- Phase 4: Resend idempotency key API support and Gmail/Yahoo `List-Unsubscribe-Post` enforcement should be verified before implementation

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 01-01-PLAN.md — Drizzle schema, db singleton, and migration SQL generated
Resume file: None
