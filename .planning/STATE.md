# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Shopify customers auto-segmented by RFM score, with triggered email flows that actually fire — a full CRM loop that Shopify, Klaviyo, and HubSpot each only half-solve.
**Current focus:** Phase 6 — Dashboard and Customer UI

## Current Position

Phase: 6 of 7 (Dashboard and Customer UI) — Active
Plan: 1 of 2 — plan 01 complete
Status: Active — Phase 6 plan 01 complete
Last activity: 2026-02-19 — Phase 6 plan 01 complete: KPI dashboard page, SegmentChart, RevenueChart, 5 dashboard query functions

Progress: [██████████] 90%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 3.9 min
- Total execution time: 0.52 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2/2 | 6 min | 3 min |
| 02-shopify-integration | 5/5 | 18 min | 3.6 min |
| 03-rfm-engine | 2/2 | 6 min | 3 min |
| 04-email-infrastructure | 2/2 | 9 min | 4.5 min |
| 05-automation-engine | 2/2 | 7 min | 3.5 min |
| 06-dashboard-and-customer-ui | 1/2 | 8 min | 8 min |

**Recent Trend:**
- Last 5 plans: 03-02 (3 min), 04-01 (6 min), 04-02 (3 min), 05-02 (4 min), 06-01 (8 min)
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
- [Phase 03-rfm-engine]: db.execute<T>() returns RowList<T[]> which IS the array directly — no .rows property; T must extend Record<string,unknown> per drizzle-orm postgres-js constraint
- [Phase 03-rfm-engine]: NTILE ordering ASC NULLS FIRST for all three RFM dimensions ensures NULL/zero customers receive quintile 1 (lowest score)
- [Phase 03-rfm-engine]: mapRfmToSegment priority order: champion > loyal > new > potential > at_risk > hibernating > lost; covers all 125 R/F/M combinations
- [Phase 03-rfm-engine]: dailyRfmRecalculation uses step.run() for two distinct Inngest steps — scoring and event-emission are independently resumable on retry
- [Phase 03-rfm-engine]: Counter updates (per-event) use updateCustomerCountersFromOrders; full NTILE quintile recalculation (daily cron) kept separate to avoid expensive window queries on every webhook
- [Phase 04-email-infrastructure]: templateFactory pattern for sendMarketingEmail — (unsubscribeUrl: string) => ReactElement ensures List-Unsubscribe header URL == email body URL
- [Phase 04-email-infrastructure]: SHOPIFY_CLIENT_SECRET used as HMAC signing key for unsubscribe tokens — no new secret needed, key already scoped to shop
- [Phase 04-email-infrastructure]: Unsubscribe tokens do not expire — links in sent emails must always work regardless of age
- [Phase 04-email-infrastructure]: All email send failures return SendResult (never throw) — email errors are non-fatal to automation engine
- [Phase 04-email-infrastructure]: resend.emails.send(options, { idempotencyKey }) — second argument pattern per Resend SDK v6+
- [Phase 04-email-infrastructure]: Single /api/unsubscribe route handles GET link-click, POST one-click RFC 8058, and POST resubscribe flows — distinguished by method + form body
- [Phase 04-email-infrastructure]: Shopify tagsAdd/tagsRemove is best-effort on unsubscribe — tag sync failure must not block compliance opt-out
- [Phase 04-email-infrastructure]: svix webhook verification for Resend is a known gap — accepted per plan spec, TODO comment in route
- [Phase 05-automation-engine]: eventTimestamp read from event.data in processSegmentChange — never new Date() — prevents duplicate sends on Inngest retry by keeping idempotency key stable
- [Phase 05-automation-engine]: recalcTimestamp generated ONCE before segmentChanges loop in dailyRfmRecalculation — all events in a batch share the same timestamp for consistent idempotency
- [Phase 05-automation-engine]: executeTagAction is best-effort (catch+log, no rethrow) — Shopify tag sync failure must not block automation engine
- [Phase 05-automation-engine]: automation/first_order emit wrapped in try/catch in processShopifyWebhook — event emission failure must not break webhook processing
- [Phase 05-automation-engine]: Inline segment filter in checkDaysSinceOrder step.run instead of evaluateSegmentFilter — avoids JsonifyObject type incompatibility when Inngest serializes AutomationRow dates
- [Phase 05-automation-engine]: Automations page at (dashboard)/automations/page.tsx to inherit dashboard sidebar layout via Next.js route group
- [Phase 06-dashboard-and-customer-ui]: db.execute<T>() with single correlated-subquery SQL for getDashboardKpis — one round-trip for 4 KPIs instead of 4 separate queries
- [Phase 06-dashboard-and-customer-ui]: shopifyUpdatedAt used as proxy for "recently moved to churn segment" in getChurnAlerts — acceptable approximation since daily RFM cron updates customers when segment changes
- [Phase 06-dashboard-and-customer-ui]: Revenue strings converted to parseFloat only inside chart component — DB/API layers always remain Decimal/string
- [Phase 06-dashboard-and-customer-ui]: Tooltip content={<CustomTooltip />} pattern for RevenueChart — avoids Recharts generic Tooltip type complexity

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2: Shopify `bulkOperationRunQuery` async model should be verified against current Shopify docs before implementation (research flagged as needs validation)
- (Resolved Phase 4) Resend idempotency key and List-Unsubscribe-Post: verified — idempotencyKey is a first-class option in Resend SDK v6+, List-Unsubscribe-Post header can be set via custom headers

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 06-01-PLAN.md — dashboard KPI cards, SegmentChart, RevenueChart, churn alerts, activity feed
Resume file: None
