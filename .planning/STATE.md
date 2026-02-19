# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Shopify customers auto-segmented by RFM score, with triggered email flows that actually fire — a full CRM loop that Shopify, Klaviyo, and HubSpot each only half-solve.
**Current focus:** Phase 3 — RFM Engine

## Current Position

Phase: 3 of 7 (RFM Engine)
Plan: 0 of 2 — ready to plan
Status: Active — Phase 2 fully verified (5/5, human approved), ready for Phase 3
Last activity: 2026-02-19 — Phase 2 complete: gap closure plans 02-04/02-05 executed, verification passed

Progress: [█████░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 4 min
- Total execution time: 0.30 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2/2 | 6 min | 3 min |
| 02-shopify-integration | 5/5 | 18 min | 3.6 min |

**Recent Trend:**
- Last 5 plans: 01-02 (3 min), 02-01 (3 min), 02-02 (6 min), 02-03 (8 min), 02-04 (2 min)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- OAuth Partners Dashboard app (not Custom App): SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET used via client credentials grant — no static SHOPIFY_ACCESS_TOKEN needed
- Inngest for scheduling: Handles retries, idempotency, cron natively — all async work goes through Inngest
- Quintile-based RFM: Must run as PostgreSQL NTILE(5) window function — never in application memory
- Resend + React Email: @react-email/render@2.0.4 and decimal.js@10.6.0 installed as explicit deps in Phase 1-02
- prepare: false on postgres client is mandatory for Supabase Transaction mode pooler (port 6543) — omitting causes "prepared statements are not supported" errors under load
- All pgEnums must be exported with export const at module top level — drizzle-kit silently skips non-exported enums, producing missing CREATE TYPE in migration
- numeric(19,4) used for all money fields (total_spent, avg_order_value, total_price) — never float to avoid precision loss
- shop_id column on every table enables future multi-tenant support without schema migration
- InngestFunction.Like[] (not GetFunctionOutput<any>[]) is the correct type for the functions array passed to serve() — GetFunctionOutput produces unknown[] which is incompatible
- env.ts import throws at module load on missing vars — all app code imports env from '@/lib/env', never process.env directly
- Cost-based proactive throttling: shopifyGraphQL sleeps when currentlyAvailable < requestedQueryCost*2 to prevent 429s before they occur
- shopifyClient.rawQuery<T> exposes full GraphQLResponse (including extensions.cost) for callers needing cost metadata
- syncLogs.cursor stores checkpoint for resume-on-failure in bulk operations; webhookDeliveries unique index on (shop_id, webhook_id) enforces idempotency at DB level
- bulk_operations/finish handled inline in processShopifyWebhook switch-case — no separate dead-code processFullSyncCompletion function
- Checkpoint-based resume: syncLog.cursor stores last processed GID, written every 100 records; startFullSync checks getFailedSyncWithCursor before starting fresh
- upsertCustomer.onConflictDoUpdate.set excludes rfmR/rfmF/rfmM/segment/lifecycleStage — CRM field preservation enforced at query layer
- Decimal used for all money arithmetic including intermediate avgOrderValue computation — never parseFloat anywhere in shopify/ db/ inngest/
- shopId derived from new URL(env.SHOPIFY_STORE_URL).hostname — consistent single-tenant identifier pattern
- Adaptive polling: setTimeout chain (not setInterval) — 2s when running, 10s when idle, avoids drift
- hasAutoTriggered ref: prevents duplicate /api/sync POSTs when React re-renders on mount in development
- SyncActions extracted as separate client component from settings page to keep page.tsx as Server Component
- [Phase 02-shopify-integration]: upsertCustomer/upsertOrder setWhere uses or(isNull, lte) timestamp guards — older webhook replays cannot overwrite newer stored data
- [Phase 02-shopify-integration]: updateWebhookDeliveryStatus uses plain .update() (not insert-or-ignore) to flip existing processing row to dead_letter after Inngest retries exhausted

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2: Shopify `bulkOperationRunQuery` async model should be verified against current Shopify docs before implementation (research flagged as needs validation)
- Phase 4: Resend idempotency key API support and Gmail/Yahoo `List-Unsubscribe-Post` enforcement should be verified before implementation

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 02-04-PLAN.md — gap closure for sync failure path and last-write-wins fixes
Resume file: None
