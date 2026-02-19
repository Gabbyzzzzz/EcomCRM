# EcomCRM

## What This Is

A lightweight CRM + marketing automation tool for Shopify small-team merchants. Connects to a real Shopify store via Custom App, auto-syncs customer and order data, segments customers using RFM scoring, and runs triggered email automation flows. Built for self-use and as a portfolio/interview demo — everything must actually work end-to-end with real data and real emails.

## Core Value

Shopify customers auto-segmented by RFM score, with triggered email flows that actually fire — a full CRM loop that Shopify, Klaviyo, and HubSpot each only half-solve.

## Requirements

### Validated

- ✓ Next.js 14 (App Router) + TypeScript scaffolding — existing
- ✓ Tailwind CSS + shadcn/ui configured — existing
- ✓ All dependencies installed (Drizzle, Supabase, Inngest, Resend, Recharts, Claude SDK) — existing

### Active

- [ ] PostgreSQL schema (Customer, Order, Automation, MessageLog) via Drizzle + Supabase
- [ ] Shopify Custom App integration (GraphQL client with rate limit handling)
- [ ] Full customer + order sync (bulk + incremental via webhooks)
- [ ] RFM scoring engine (quintile-based, auto-segments into 7 labels)
- [ ] Dashboard with KPIs (total customers, revenue, churn alerts, segment distribution)
- [ ] Customer list with segment filters and search
- [ ] Customer 360° profile (order timeline, RFM scores, tags, lifecycle stage)
- [ ] 5 preset email automation flows (welcome, abandoned cart, repurchase, winback, VIP)
- [ ] Automation engine (trigger evaluation, delay handling, action execution)
- [ ] Email sending via Resend + React Email templates
- [ ] AI-powered customer insights via Claude API
- [ ] Inngest cron jobs (daily RFM recalculation, automation checks)
- [ ] Webhook ingestion (orders/create, orders/updated, customers/create, customers/update)

### Out of Scope

- Public App / OAuth Shopify flow — Custom App only (single store, no multi-tenant auth)
- SMS channel — email only for v1
- Multi-tenant (multiple stores) — single store, shop_id column reserved for future
- Mobile app — web only
- Custom automation builder — 5 preset flows only for v1
- A/B testing, open-rate tracking pixel — future

## Context

- Existing code is boilerplate Next.js 14 skeleton; no business logic implemented yet
- Shopify integration uses Custom App access token (env var), not OAuth — simpler and sufficient for single-store use
- RFM scoring is quintile-based across all customers (adaptive thresholds, not fixed)
- Webhook verification uses HMAC-SHA256 with SHOPIFY_WEBHOOK_SECRET
- Money fields always stored as decimal strings, never floats
- This is the authoritative project spec; CLAUDE.md contains the full technical schema and coding rules

## Constraints

- **Tech Stack**: Next.js 14 App Router, TypeScript strict, Drizzle ORM, Supabase PostgreSQL — locked per CLAUDE.md
- **Shopify**: Custom App only (no Public App OAuth) — single store access token in env
- **Code Quality**: TypeScript strict (no `any`), zod validation on all API inputs, HMAC verification on webhooks — non-negotiable for portfolio quality
- **Data**: Real Shopify store data, not mock — demo must show actual customer/order sync
- **Email**: Real sends via Resend (not just logged) — automation flows must actually fire

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Custom App (not Public App) | Single store, no OAuth complexity needed | — Pending |
| Inngest for scheduling | Handles retries, idempotency, cron natively | — Pending |
| Quintile-based RFM | Adaptive to store size, no fixed thresholds | — Pending |
| Resend + React Email | Type-safe templates, reliable delivery | — Pending |
| Claude API for insights | Portfolio differentiator, AI layer on top of CRM data | — Pending |

---
*Last updated: 2026-02-19 after initialization*
