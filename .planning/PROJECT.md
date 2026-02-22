# EcomCRM

## What This Is

A lightweight CRM + marketing automation tool for Shopify small-team merchants. Connects to a real Shopify store via Partners Dashboard OAuth app, auto-syncs customer and order data, segments customers using RFM scoring, and runs triggered email automation flows with configurable content, live preview, visual drag-and-drop template editing, and email performance tracking. Built for self-use and as a portfolio/interview demo — everything works end-to-end with real Shopify data and real Resend email delivery.

## Core Value

Shopify customers auto-segmented by RFM score, with triggered email flows that actually fire — a full CRM loop that Shopify, Klaviyo, and HubSpot each only half-solve.

## Requirements

### Validated

- ✓ Next.js 14 (App Router) + TypeScript scaffolding — v1.0
- ✓ Tailwind CSS + shadcn/ui configured — v1.0
- ✓ All dependencies installed (Drizzle, Supabase, Inngest, Resend, Recharts, AI SDK) — v1.0
- ✓ PostgreSQL schema (Customer, Order, Automation, MessageLog) via Drizzle + Supabase — v1.0
- ✓ Shopify OAuth integration (GraphQL client with rate limit handling) — v1.0
- ✓ Full customer + order sync (bulk + incremental via webhooks) — v1.0
- ✓ RFM scoring engine (quintile-based, auto-segments into 7 labels) — v1.0
- ✓ Dashboard with KPIs (total customers, revenue, churn alerts, segment distribution) — v1.0
- ✓ Customer list with segment filters and search — v1.0
- ✓ Customer 360° profile (order timeline, RFM scores, tags, lifecycle stage) — v1.0
- ✓ 5 preset email automation flows (welcome, abandoned cart, repurchase, winback, VIP) — v1.0
- ✓ Automation engine (trigger evaluation, delay handling, action execution) — v1.0
- ✓ Email sending via Resend + React Email templates — v1.0
- ✓ AI-powered customer insights via Claude/Gemini API — v1.0
- ✓ Inngest cron jobs (daily RFM recalculation, automation checks) — v1.0
- ✓ Webhook ingestion (orders/create, orders/updated, customers/create, customers/update) — v1.0
- ✓ End-to-end automation pipeline verified working with real Shopify data — v1.1
- ✓ Automation flow configuration editable in UI (delay, thresholds, discount, subject, body) — v1.1
- ✓ Email content customization with live preview on automation detail page — v1.1
- ✓ Test send delivers current unsaved form content to inbox without saving — v1.1
- ✓ UI polish: skeleton loaders + empty states on dashboard, customers, automations — v1.1
- ✓ Automation toggle persistence fixed; Active/Inactive badge syncs with DB state — v1.1
- ✓ Open tracking pixel in every outgoing email; records opened_at in message_logs — v2.0
- ✓ Click tracking via redirect endpoint; records email_clicks table entries — v2.0
- ✓ Customer profile Message History shows engagement icons (✓ sent, 👁 opened, 🔗 clicked) with timestamps — v2.0
- ✓ Automation detail page: per-flow open rate and click rate stats — v2.0
- ✓ Unlayer drag-and-drop template editor at /emails/[id]/edit with Supabase Storage image upload — v2.0
- ✓ Template library at /emails with Create/Duplicate/Delete; placeholder thumbnail cards — v2.0
- ✓ 5 preset Unlayer templates (welcome, abandoned-cart, repurchase, winback, VIP) seeded natively — v2.0
- ✓ Automation detail page: template selector + 3-tier content fallback in send logic — v2.0
- ✓ Inline Unlayer editor for flow-specific customization ("Customize for this Flow") — v2.0
- ✓ Dynamic variable injection (customer name, discount code, store name, unsubscribe link) across all template tiers — v2.0
- ✓ Email performance dashboard section (total sent, open rate, click rate last 30 days) — v2.0
- ✓ Automation list shows per-flow open rate and click rate columns — v2.0
- ✓ Automation detail shows sends/opens/clicks over time line chart (last 30 days) — v2.0

### Active (v3.0)

- [ ] OAuth 2.0 install flow: any merchant installs via standard Shopify OAuth
- [ ] shops table with encrypted access token, plan, status per merchant
- [ ] Auth middleware injects shopId into all DB queries from session/JWT
- [ ] app/uninstalled webhook: mark shop inactive, retain data 30 days then purge
- [ ] shop_id WHERE clause on every DB query (customers, orders, automations, message_logs, email_templates, email_clicks)
- [ ] Supabase Row Level Security (RLS) policies as secondary enforcement
- [ ] Webhook handler validates shop_id from Shopify header before processing
- [ ] RFM scoring partitioned per-shop: NTILE(5) OVER (PARTITION BY shop_id)
- [ ] Shopify Billing API: 4 plan tiers (Free/Starter $29/Growth $79/Pro $149), plan limits enforced
- [ ] In-app upgrade/downgrade flow with billing confirmation redirect
- [ ] Auto-register webhooks on install; fallback sender domain (mail.ecomcrm.app) verified in Resend
- [ ] Privacy policy (/privacy), terms (/terms), data export + deletion from Settings
- [ ] App Store listing: description, screenshots, pricing table, demo video

### Out of Scope

- SMS channel — email only for v1/v2/v3; revisit post-App Store launch
- A/B testing — dropped; revisit in a future milestone
- Auto-generated template thumbnails — placeholder used instead; avoids Puppeteer/screenshot API on Vercel serverless
- Custom sender domain DNS wizard — link to Resend's own domain verification UI
- Embedded Shopify admin app (Polaris/App Bridge) — external standalone app only; shadcn/ui stays
- Visual drag-and-drop flow builder — preset flows sufficient for v1/v2/v3
- Predictive CLV/churn ML — RFM + Claude narratives deliver 90% of value

## Context

**Shipped:** v2.0 (2026-02-22) — 15 phases, 9 v2.0 plans (27 total v1+v1.1+v2.0), ~13,675 LOC TypeScript

**Tech stack:**
- Next.js 14 App Router + TypeScript strict
- Drizzle ORM + Supabase PostgreSQL (PgBouncer Transaction mode)
- Inngest (cron + event-driven background jobs)
- Resend + React Email (5 templates — kept as tier-3 fallback) + Unlayer free tier (visual editor)
- Vercel AI SDK — Google Gemini (default) or Anthropic Claude
- shadcn/ui + Tailwind CSS + Recharts
- Deployed to Vercel (external standalone app, not embedded in Shopify admin)

**Current state:**
- Shopify webhooks registered to `https://ecomcrm.vercel.app/api/webhooks/shopify` (4 topics)
- Auth uses client_credentials grant (Partners Dashboard OAuth app, single-store)
- v2.0 adds: email_clicks table, email_templates table, Unlayer editor, 3-tier send fallback, tracking pixel + link rewriting, performance dashboard
- Next: v3.0 transforms single-store tool into multi-tenant public Shopify app

## Constraints

- **Tech Stack**: Next.js 14 App Router, TypeScript strict, Drizzle ORM, Supabase PostgreSQL — locked per CLAUDE.md
- **Shopify**: Partners Dashboard OAuth app, client_credentials grant — do NOT change to static access token
- **Code Quality**: TypeScript strict (no `any`), zod validation on all API inputs, HMAC verification on webhooks
- **Data**: Real Shopify store data, not mock — demo must show actual customer/order sync
- **Email**: Real sends via Resend — automation flows must actually fire
- **App type**: External/standalone (not embedded in Shopify admin) — keep shadcn/ui, no Polaris

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Partners Dashboard OAuth app (client_credentials) | Single store, token auto-refreshes every 24h | ✓ Good — no manual token rotation |
| Inngest for scheduling | Handles retries, idempotency, cron natively | ✓ Good — zero duplicate sends |
| Quintile-based RFM | Adaptive to store size, no fixed thresholds | ✓ Good — works from 1 to 10K customers |
| Resend + React Email | Type-safe templates, reliable delivery | ✓ Good — kept as tier-3 fallback in v2 |
| Vercel AI SDK + Gemini default | Swap to Claude via env var | ✓ Good — flexible without code change |
| Controlled AutomationConfigForm | No internal state — parent owns all form values | ✓ Good — enables shared state with live preview |
| Three-layer content priority (body > DB > defaults) | Unsaved edits visible in test send and preview | ✓ Good — zero save-before-preview friction |
| Next.js loading.tsx for skeletons | App Router Suspense boundary, zero extra code | ✓ Good — route-level coverage |
| External standalone app (no Polaris) | Avoid Shopify admin embedding complexity | ✓ Good — shadcn/ui stays, simpler v3 path |
| Unlayer presets built natively (not converted from React Email) | React Email JSX → Unlayer JSON conversion is non-trivial | ✓ Good — two systems coexist cleanly |
| Placeholder thumbnails (no auto-generation) | No headless browser on Vercel serverless | ✓ Good — avoids Puppeteer/screenshot API complexity |
| HOOK-03 links to Resend UI (no custom wizard) | DNS wizard is UX-heavy and support-intensive | ✓ Good — Resend's own UI is better |
| Best-effort tracking (try/catch, never throw) | Tracking should never break email delivery | ✓ Good — send reliability preserved |
| MessageLog pre-inserted before Resend call | messageLogId needed for tracking URLs in pixel and link rewrite | ✓ Good — atomic UUID reference without second INSERT |
| email_clicks records every click; messageLogs.clicked_at is first-click only | Multi-click analytics vs. first-touch attribution split | ✓ Good — both use cases supported |
| 3-tier template fallback: custom HTML > linked template > React Email | Never fail email sends; React Email always succeeds | ✓ Good — graceful degradation to proven baseline |
| Unlayer engine pinned to version 1.157.0 | registerCallback image only works on free tier with pinned version | ✓ Good — stable image uploads |
| getAutomationListWithRates uses LEFT JOIN subquery | Avoid N+1 per-row getAutomationEmailStats calls | ✓ Good — single query for all automations |
| Automation list shows "—" for 0-send flows (not "0%") | Distinguishes no-data from actual 0% rate | ✓ Good — cleaner UX |

---
*Last updated: 2026-02-22 after v2.0 milestone*
