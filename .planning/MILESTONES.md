# Milestones: EcomCRM

## v1.0 — Full CRM Loop (Complete)

**Completed:** 2026-02-21
**Phases:** 1–7 (18 plans total)
**Duration:** 2026-02-19 to 2026-02-21

**What shipped:**
- Foundation: Drizzle schema, Supabase connection, Inngest, env validation
- Shopify Integration: OAuth GraphQL client, bulk + webhook sync, rate limiting
- RFM Engine: NTILE(5) scoring, 7 segments, daily cron, segment-change events
- Email Infrastructure: Resend + React Email, 5 templates, compliance headers, unsubscribe
- Automation Engine: 5 preset flows, trigger evaluation, delay handling, idempotent sends
- Dashboard + Customer UI: KPIs, segment chart, revenue chart, customer list, 360 profiles
- AI Insights: Claude-powered customer narratives, email copy generation

**Requirements:** 50 defined, 50 mapped to phases
**Last phase:** Phase 7 (AI Insights)

---
*Last updated: 2026-02-21*

## v1.1 — Make It Real: Production-Ready Automations (Complete)

**Completed:** 2026-02-22
**Phases:** 8–11 (8 plans total)
**Duration:** 2026-02-21 to 2026-02-22

**What shipped:**
- Pipeline Verification: REST webhook normalization, Shopify → DB GID conversion, days_since_order cron trigger verified end-to-end
- Configuration UI: Automation delay, thresholds, discount code, subject, and body all editable in-app
- Live Preview: Unsaved form content visible in email preview without saving; test send delivers current state to inbox
- UI Polish: Skeleton loaders + empty states on dashboard, customers, automations pages; Active/Inactive badge fixed

**Last phase:** Phase 11 (UI Polish)

---

## v2.0 — Email Intelligence + Template Editor (Complete)

**Completed:** 2026-02-22
**Phases:** 12–15 (9 plans total)
**Files changed:** 54 files, 7,574 insertions, 254 deletions
**Duration:** 2026-02-22 (single-day sprint)

**What shipped:**
- Open & Click Tracking: 1×1 GIF pixel + 302 redirect endpoints, email_clicks table, best-effort idempotent DB writes (MPP inflation documented)
- Tracking Injection: sendMarketingEmail pre-inserts MessageLog for UUID, rewrites all links, skips unsubscribe URLs; engagement icons in customer profile
- Template Library: email_templates table with CRUD API, /emails list page with colored placeholder cards, Create/Duplicate/Delete
- Unlayer Editor: Drag-and-drop editor at /emails/[id]/edit with Supabase Storage image upload; design JSON persisted for re-editing
- Preset Templates: 5 Unlayer-native presets (welcome, abandoned-cart, repurchase, winback, VIP) seeded; React Email kept as tier-3 fallback
- Template ↔ Automation Linking: 3-tier content fallback (custom HTML > linked template > React Email), template selector dropdown, inline Unlayer customization per flow
- Email Performance Dashboard: KPI section (total sent, open rate, click rate), per-flow rate columns on automation list, time-series line chart on automation detail

**Last phase:** Phase 15 (Email Performance Dashboard)

---
