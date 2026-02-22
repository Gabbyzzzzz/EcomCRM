# EcomCRM

## What This Is

A lightweight CRM + marketing automation tool for Shopify small-team merchants. Connects to a real Shopify store via Partners Dashboard OAuth app, auto-syncs customer and order data, segments customers using RFM scoring, and runs triggered email automation flows with configurable content and live preview. Built for self-use and as a portfolio/interview demo — everything works end-to-end with real Shopify data and real Resend email delivery.

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
- ✓ Test send capability delivers current in-form content to inbox without saving — v1.1
- ✓ UI polish for demo-readiness (skeleton loaders + empty states on all pages) — v1.1
- ✓ Automation toggle state persists to database and Active/Inactive badge syncs — v1.1

### Active

_(None — v1.1 shipped. Define v2 requirements with `/gsd:new-milestone`.)_

### Out of Scope

- Public App / OAuth Shopify flow — Custom App only (single store, no multi-tenant auth)
- SMS channel — email only for v1
- Multi-tenant (multiple stores) — single store, shop_id column reserved for future
- Mobile app — web only
- Custom automation builder — 5 preset flows only for v1
- A/B testing, open-rate tracking pixel — future
- WYSIWYG email editor — React Email + textarea editing sufficient for v1

## Context

**Shipped:** v1.1 (2026-02-22) — 11 phases, 26 plans, 43 files changed, ~11,700 LOC TypeScript

**Tech stack:**
- Next.js 14 App Router + TypeScript strict
- Drizzle ORM + Supabase PostgreSQL (PgBouncer Transaction mode)
- Inngest (cron + event-driven background jobs)
- Resend + React Email (5 templates with custom content props)
- Vercel AI SDK — Google Gemini (default) or Anthropic Claude
- shadcn/ui + Tailwind CSS + Recharts
- Deployed to Vercel

**Current state:**
- Shopify webhooks registered to `https://ecomcrm.vercel.app/api/webhooks/shopify` (4 topics)
- Auth uses client_credentials grant (Partners Dashboard OAuth app) — token cached in memory, auto-refreshed
- All automation content (subject, headline, body, CTA, discount) flows from UI form → DB actionConfig → executeEmailAction → Resend
- Test send and live preview both use unsaved form state (no save required)

## Constraints

- **Tech Stack**: Next.js 14 App Router, TypeScript strict, Drizzle ORM, Supabase PostgreSQL — locked per CLAUDE.md
- **Shopify**: Partners Dashboard OAuth app, client_credentials grant — do NOT change to static access token
- **Code Quality**: TypeScript strict (no `any`), zod validation on all API inputs, HMAC verification on webhooks
- **Data**: Real Shopify store data, not mock — demo must show actual customer/order sync
- **Email**: Real sends via Resend — automation flows must actually fire

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Partners Dashboard OAuth app (client_credentials) | Single store, token auto-refreshes every 24h | ✓ Good — no manual token rotation |
| Inngest for scheduling | Handles retries, idempotency, cron natively | ✓ Good — zero duplicate sends |
| Quintile-based RFM | Adaptive to store size, no fixed thresholds | ✓ Good — works from 1 to 10K customers |
| Resend + React Email | Type-safe templates, reliable delivery | ✓ Good — custom props make content overrides clean |
| Vercel AI SDK + Gemini default | Swap to Claude via env var | ✓ Good — flexible without code change |
| Controlled AutomationConfigForm | No internal state — parent owns all form values | ✓ Good — enables shared state with live preview |
| Three-layer content priority (body > DB > defaults) | Unsaved edits visible in test send and preview | ✓ Good — zero save-before-preview friction |
| Next.js loading.tsx for skeletons | App Router Suspense boundary, zero extra code | ✓ Good — route-level coverage with no client wrappers |
| PgBouncer Transaction mode (port 6543) | Serverless connection pooling | ✓ Good — no connection exhaustion under concurrency |
| REST webhook normalization at Inngest boundary | Shopify webhooks are REST format, internal types are GQL-format | ✓ Good — clear boundary, no type leakage |

---
*Last updated: 2026-02-22 after v1.1 milestone shipped*
