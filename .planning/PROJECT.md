# EcomCRM

## What This Is

A lightweight CRM + marketing automation tool for Shopify small-team merchants. Connects to a real Shopify store via Partners Dashboard OAuth app, auto-syncs customer and order data, segments customers using RFM scoring, and runs triggered email automation flows with configurable content, live preview, and visual template editing. Built for self-use and as a portfolio/interview demo — everything works end-to-end with real Shopify data and real Resend email delivery.

## Core Value

Shopify customers auto-segmented by RFM score, with triggered email flows that actually fire — a full CRM loop that Shopify, Klaviyo, and HubSpot each only half-solve.

## Current Milestone: v2.0 Email Intelligence + Template Editor

**Goal:** Make email performance measurable and give merchants a visual drag-and-drop template editor — upgrading from static React Email components to a fully configurable, trackable email system.

**Target features:**
- Open and click tracking (pixel + redirect, Apple MPP documented as known limitation)
- Unlayer drag-and-drop template editor with Supabase Storage image upload
- 5 preset templates built natively in Unlayer (React Email stays as tier-3 fallback, not removed)
- Template library linked to automation flows with 3-tier content fallback
- Email performance dashboard: open rate, click rate per flow and overall

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

### Active

- [ ] Open tracking pixel in every outgoing email; records opened_at in message_logs
- [ ] Click tracking via redirect endpoint; records email_clicks table entries
- [ ] Unlayer drag-and-drop template editor at /emails/[id]/edit
- [ ] Template library at /emails with Create/Duplicate/Delete
- [ ] Image upload to Supabase Storage from within Unlayer editor
- [ ] 5 preset Unlayer templates (built natively — React Email kept as fallback tier)
- [ ] Automation detail page: template selector + 3-tier content fallback in send logic
- [ ] Dynamic variable injection (customer name, discount code, etc.) across all template tiers
- [ ] Email performance dashboard section (sent/opens/clicks, per-flow rates, over-time chart)

### Out of Scope

- SMS channel — email only for v1/v2; revisit in a future milestone
- A/B testing — dropped from v2; will revisit later
- Auto-generated template thumbnails — placeholder (name + colored background) used instead
- Custom sender domain DNS wizard — link to Resend's own domain verification UI
- Embedded Shopify admin app (Polaris/App Bridge) — external standalone app only; shadcn/ui stays
- Visual drag-and-drop flow builder — preset flows sufficient for v1/v2
- Predictive CLV/churn ML — RFM + Claude narratives deliver 90% of value

## Context

**Shipped:** v1.1 (2026-02-22) — 11 phases, 26 plans, 43 files changed, ~11,700 LOC TypeScript

**Tech stack:**
- Next.js 14 App Router + TypeScript strict
- Drizzle ORM + Supabase PostgreSQL (PgBouncer Transaction mode)
- Inngest (cron + event-driven background jobs)
- Resend + React Email (5 templates with custom content props — kept as tier-3 fallback in v2)
- Vercel AI SDK — Google Gemini (default) or Anthropic Claude
- shadcn/ui + Tailwind CSS + Recharts
- Deployed to Vercel (external standalone app, not embedded in Shopify admin)

**Current state:**
- Shopify webhooks registered to `https://ecomcrm.vercel.app/api/webhooks/shopify` (4 topics)
- Auth uses client_credentials grant (Partners Dashboard OAuth app)
- All automation content flows from UI form → DB actionConfig → executeEmailAction → Resend
- v2 adds: email_clicks table, email_templates table, Unlayer editor, 3-tier send fallback

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

---
*Last updated: 2026-02-22 after v2.0 milestone defined*
