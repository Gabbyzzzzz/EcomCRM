# Requirements: EcomCRM

**Defined:** 2026-02-19
**Core Value:** Shopify customers auto-segmented by RFM score, with triggered email flows that actually fire — a full CRM loop that Shopify, Klaviyo, and HubSpot each only half-solve.

---

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: Database schema exists (customers, orders, automations, message_logs tables with all columns per CLAUDE.md spec)
- [ ] **FOUND-02**: Drizzle migration workflow established (`generate` + `migrate`, never `push` to production)
- [ ] **FOUND-03**: Supabase connection uses PgBouncer Transaction mode pooler endpoint (port 6543)
- [ ] **FOUND-04**: Missing packages added (`@react-email/render`, `decimal.js`)
- [ ] **FOUND-05**: All env vars documented and loaded (SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN, SHOPIFY_WEBHOOK_SECRET, DATABASE_URL, RESEND_API_KEY, ANTHROPIC_API_KEY, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY)
- [ ] **FOUND-06**: Inngest client configured and `/api/inngest` serve handler registered

### Shopify Integration

- [ ] **SHOP-01**: Shopify GraphQL client with cost-based throttle handling (checks `extensions.cost`, backoffs when budget low)
- [ ] **SHOP-02**: Initial full sync via `bulkOperationRunQuery` — customers + orders loaded into DB
- [ ] **SHOP-03**: Bulk sync is async (webhook-based completion via `bulk_operations/finish`, not polling loop)
- [ ] **SHOP-04**: Webhook ingestion endpoint (`/api/webhooks/shopify`) with HMAC-SHA256 verification using `req.text()` before any parsing
- [ ] **SHOP-05**: Webhook idempotency — deduplicates on `X-Shopify-Webhook-Id` to handle Shopify at-least-once delivery
- [ ] **SHOP-06**: Incremental sync handles: `orders/create`, `orders/updated`, `customers/create`, `customers/update`
- [ ] **SHOP-07**: All money values stored as `NUMERIC(10,2)` / `decimal.js` — never `parseFloat()` or `float`
- [ ] **SHOP-08**: Orders inserted during initial sync flagged `is_historical = true` (prevents automation firing on backfill)
- [ ] **SHOP-09**: Sync status visible in UI ("Last synced X ago" — alert if stale >24h)

### RFM Engine

- [ ] **RFM-01**: RFM scoring computed via PostgreSQL `NTILE(5) OVER` window functions — not in application memory
- [ ] **RFM-02**: Quintile boundaries calculated from all customers in store (adaptive — no fixed thresholds)
- [ ] **RFM-03**: Scores produce 7 named segments: champion / loyal / potential / new / at_risk / hibernating / lost
- [ ] **RFM-04**: RFM triggered on each order event (updates counters only — `order_count`, `total_spent`, `last_order_at`)
- [ ] **RFM-05**: Daily Inngest cron recalculates full quintile boundaries + segment assignments for all customers
- [ ] **RFM-06**: Segment changes detected and logged (enables segment-change automation trigger)

### Customer CRM

- [ ] **CRM-01**: Customer list page with pagination, search by name/email, filter by segment
- [ ] **CRM-02**: Customer 360° profile — order timeline, RFM scores (R/F/M values + segment label), tags, lifecycle stage, total spent, avg order value
- [ ] **CRM-03**: Message history shown on customer profile (sent emails with open/click status)
- [ ] **CRM-04**: Tags from Shopify synced to customer; tags added/removed via automation flow back to Shopify

### Email Infrastructure

- [ ] **EMAIL-01**: Unsubscribe management — Resend unsubscribe webhook updates `customer.marketing_opted_out = true` immediately
- [ ] **EMAIL-02**: All automation sends gated on `marketing_opted_out = false`
- [ ] **EMAIL-03**: Hard bounce handling — bounced contacts suppressed from future sends
- [ ] **EMAIL-04**: Marketing email uses subdomain separate from transactional (deliverability)
- [ ] **EMAIL-05**: `List-Unsubscribe` and `List-Unsubscribe-Post` headers on all marketing emails (Gmail/Yahoo bulk sender requirement)
- [ ] **EMAIL-06**: 5 React Email templates: welcome, abandoned-cart, repurchase, winback, VIP — polished, mobile-responsive

### Automation Engine

- [ ] **AUTO-01**: Automation trigger types: `first_order`, `segment_change`, `days_since_order`, `tag_added`, `cart_abandoned`
- [ ] **AUTO-02**: `is_historical` filter — automations never fire on backfilled historical orders
- [ ] **AUTO-03**: Delay handling via Inngest `step.sleep()` (supports hours and days)
- [ ] **AUTO-04**: Action types: `send_email`, `add_tag`, `remove_tag`
- [ ] **AUTO-05**: All email sends use deterministic idempotency key (`customerId + automationId + eventTimestamp`) passed to Resend — prevents duplicate sends on Inngest retry
- [ ] **AUTO-06**: Send logged to `MessageLog` with status tracking (sent/opened/clicked/converted)
- [ ] **AUTO-07**: Automation list page — shows all 5 preset flows with enable/disable toggle and last run stats

### Preset Flows (5)

- [ ] **FLOW-01**: Welcome — trigger: `first_order`; delay: 1 hour; action: send welcome email
- [ ] **FLOW-02**: Abandoned cart — trigger: `cart_abandoned`; delay: 2 hours; action: send cart recovery email (cancels if order completes)
- [ ] **FLOW-03**: Repurchase — trigger: `days_since_order` (30 days); segments: loyal/new; action: send repurchase prompt
- [ ] **FLOW-04**: Win-back — trigger: `days_since_order` (90 days); segments: at_risk/hibernating; action: send win-back offer
- [ ] **FLOW-05**: VIP — trigger: `segment_change` to champion; action: send VIP welcome + add "vip" tag to Shopify

### Dashboard

- [ ] **DASH-01**: KPI cards: total customers, total revenue, new customers (30d), automation emails sent (30d)
- [ ] **DASH-02**: RFM segment distribution chart (bar/donut — count per segment)
- [ ] **DASH-03**: Revenue over time chart (line chart, last 90 days)
- [ ] **DASH-04**: Churn alert widget — customers who moved to at_risk/hibernating/lost in last 7 days
- [ ] **DASH-05**: Recent activity feed — latest automation sends and order events

### AI Insights

- [ ] **AI-01**: Per-customer insight narrative on 360° profile (Claude API) — "Customer is at risk: last ordered 90 days ago, down from monthly cadence. Suggest win-back offer."
- [ ] **AI-02**: AI-generated subject line + body copy suggestions for email templates (optional, editable)

---

## v2 Requirements

### Email

- **EMAIL-V2-01**: Open pixel tracking (img pixel in email body)
- **EMAIL-V2-02**: Click tracking (link wrapping via redirect)
- **EMAIL-V2-03**: WYSIWYG / drag-and-drop template editor

### Automation

- **AUTO-V2-01**: SMS channel (TCPA/GDPR compliance, carrier integrations)
- **AUTO-V2-02**: A/B testing for flows and subject lines
- **AUTO-V2-03**: Visual drag-and-drop flow builder

### Platform

- **PLAT-V2-01**: Multi-store / multi-tenant UI (shop_id column already in schema)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Public App / OAuth Shopify flow | Custom App only — single store, no OAuth complexity needed |
| SMS channel | TCPA/GDPR compliance + carrier setup adds months; email proven first |
| Visual flow builder | Half-built = worse UX than preset forms; v3+ investment |
| WYSIWYG email editor | React Email + code produces better output; textarea editing sufficient for v1 |
| A/B testing | Stores with <10K contacts can't reach statistical significance |
| Reviews / loyalty points | Yotpo/Smile.io own this; competing is scope creep |
| Predictive CLV/churn ML | RFM + Claude narratives deliver 90% of value at 10% of complexity |
| Social media integration | Not CRM; points to Meta Ads Manager |
| Real-time chat / push notifications | Email is the channel; build it exceptionally first |
| Multi-tenant UI | schema ready (shop_id); UI deferred |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| FOUND-06 | Phase 1 | Pending |
| SHOP-01 | Phase 2 | Pending |
| SHOP-02 | Phase 2 | Pending |
| SHOP-03 | Phase 2 | Pending |
| SHOP-04 | Phase 2 | Pending |
| SHOP-05 | Phase 2 | Pending |
| SHOP-06 | Phase 2 | Pending |
| SHOP-07 | Phase 2 | Pending |
| SHOP-08 | Phase 2 | Pending |
| SHOP-09 | Phase 2 | Pending |
| RFM-01 | Phase 3 | Pending |
| RFM-02 | Phase 3 | Pending |
| RFM-03 | Phase 3 | Pending |
| RFM-04 | Phase 3 | Pending |
| RFM-05 | Phase 3 | Pending |
| RFM-06 | Phase 3 | Pending |
| EMAIL-01 | Phase 4 | Pending |
| EMAIL-02 | Phase 4 | Pending |
| EMAIL-03 | Phase 4 | Pending |
| EMAIL-04 | Phase 4 | Pending |
| EMAIL-05 | Phase 4 | Pending |
| EMAIL-06 | Phase 4 | Pending |
| AUTO-01 | Phase 5 | Pending |
| AUTO-02 | Phase 5 | Pending |
| AUTO-03 | Phase 5 | Pending |
| AUTO-04 | Phase 5 | Pending |
| AUTO-05 | Phase 5 | Pending |
| AUTO-06 | Phase 5 | Pending |
| AUTO-07 | Phase 5 | Pending |
| FLOW-01 | Phase 5 | Pending |
| FLOW-02 | Phase 5 | Pending |
| FLOW-03 | Phase 5 | Pending |
| FLOW-04 | Phase 5 | Pending |
| FLOW-05 | Phase 5 | Pending |
| CRM-01 | Phase 6 | Pending |
| CRM-02 | Phase 6 | Pending |
| CRM-03 | Phase 6 | Pending |
| CRM-04 | Phase 6 | Pending |
| DASH-01 | Phase 6 | Pending |
| DASH-02 | Phase 6 | Pending |
| DASH-03 | Phase 6 | Pending |
| DASH-04 | Phase 6 | Pending |
| DASH-05 | Phase 6 | Pending |
| AI-01 | Phase 7 | Pending |
| AI-02 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 50 total
- Mapped to phases: 50
- Unmapped: 0

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-19 after roadmap creation*
