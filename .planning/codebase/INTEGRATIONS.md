# External Integrations

**Analysis Date:** 2026-02-19

## APIs & External Services

**E-Commerce:**
- Shopify Admin API (GraphQL)
  - What it's used for: Sync customers, orders, product data; real-time webhooks for order/customer updates
  - SDK/Client: Custom wrapper (not yet implemented, planned in `lib/shopify/client.ts`)
  - Auth: Custom App access token
  - Auth Env Var: `SHOPIFY_ACCESS_TOKEN`
  - Store URL Env Var: `SHOPIFY_STORE_URL`
  - Webhook Secret Env Var: `SHOPIFY_WEBHOOK_SECRET`

**AI & Insights:**
- Anthropic Claude API
  - What it's used for: Customer insights generation, marketing copy generation
  - SDK/Client: `@anthropic-ai/sdk` ^0.76.0
  - Auth: API key
  - Auth Env Var: `ANTHROPIC_API_KEY`
  - Usage: Planned in `lib/ai/insights.ts`

**Email Delivery:**
- Resend
  - What it's used for: Transactional and marketing email sending
  - SDK/Client: `resend` ^6.9.2
  - Auth: API key
  - Auth Env Var: `RESEND_API_KEY`
  - Templates: React Email components
  - Usage: Wrapper in `lib/email/send.ts` (planned)

## Data Storage

**Databases:**
- PostgreSQL (via Supabase)
  - Connection: PostgreSQL connection string
  - Connection Env Var: `DATABASE_URL`
  - Client: postgres ^3.4.8 (native PostgreSQL client)
  - ORM: Drizzle ORM ^0.45.1
  - Migrations: drizzle-kit ^0.31.9
  - Schema Location: `lib/db/schema.ts` (planned)
  - Query Helpers: `lib/db/queries.ts` (planned)

**File Storage:**
- Not explicitly configured
- Local filesystem only (no S3, Cloudinary, or other CDN integration detected)

**Caching:**
- Not detected in current dependencies
- Planned via Inngest task scheduling and database caching patterns

## Authentication & Identity

**Auth Provider:**
- Custom/Shopify-based
  - Implementation approach: Custom App access token from Shopify (not OAuth)
  - No additional auth provider (Auth0, Clerk, Supabase Auth) in dependencies
  - Future multi-tenant: shop_id column in all tables for multi-store support

**Session Management:**
- Not detected (admin tool, not customer-facing auth)

## Monitoring & Observability

**Error Tracking:**
- Not detected
- Recommendation: Implement Sentry or similar for production error tracking

**Logs:**
- Console logging approach (next/standard Node.js console)
- Deployment: Vercel (has built-in log aggregation)

**Analytics:**
- Not detected in dependencies

## CI/CD & Deployment

**Hosting:**
- Vercel (primary deployment target per CLAUDE.md)
- Alternative: Any Node.js 18+ platform supporting Next.js 14 SSR

**CI Pipeline:**
- Not detected
- Git repository present, likely uses Vercel's automatic deployments on push

**Environment Management:**
- Vercel environment variables for production secrets
- `.env.local` for local development (not committed)

## Environment Configuration

**Required env vars:**
- `SHOPIFY_STORE_URL` - Shopify store domain (e.g., "mystore.myshopify.com")
- `SHOPIFY_ACCESS_TOKEN` - Custom App private API token
- `SHOPIFY_WEBHOOK_SECRET` - HMAC secret for webhook signature verification
- `DATABASE_URL` - PostgreSQL connection string (Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public, safe for client)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `RESEND_API_KEY` - Resend email service API key
- `ANTHROPIC_API_KEY` - Claude API key for AI features
- `INNGEST_EVENT_KEY` - Inngest event signing key
- `INNGEST_SIGNING_KEY` - Inngest webhook verification key

**Secrets location:**
- Production: Vercel Environment Variables dashboard
- Development: `.env.local` file (gitignored)
- Never hardcoded in source code

**Public environment variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Safe to expose to browser

## Webhooks & Callbacks

**Incoming (From Shopify):**
- Endpoint: `api/webhooks/shopify/` (planned route structure)
- Events: orders/create, orders/updated, customers/create, customers/update
- Verification: HMAC-SHA256 signature verification required
- Implementation: `lib/shopify/webhooks.ts` (planned)

**Outgoing (From This App):**
- Email webhooks to Resend for delivery/bounce tracking
- Inngest webhook callbacks for task execution
- No other outgoing webhooks detected

## Task Scheduling & Asynchronous Processing

**Task Scheduler:**
- Inngest ^3.52.1
  - Purpose: Cron jobs (daily RFM recalculation) and event-driven automation
  - Event Key: `INNGEST_EVENT_KEY`
  - Signing Key: `INNGEST_SIGNING_KEY`
  - Implementation: `inngest/client.ts` and `inngest/functions.ts` (planned)
  - Functions planned:
    - Scheduled sync (daily or manual)
    - Automation trigger evaluation
    - RFM score recalculation

## Rate Limiting & Throttling

**Shopify GraphQL API:**
- Cost-based throttling required
- No rate-limiting library detected in dependencies
- Implementation expected in `lib/shopify/client.ts` wrapper

**External APIs:**
- Resend: Subject to Resend service limits
- Anthropic: Subject to API quota
- Inngest: Subject to Inngest plan limits

## Data Synchronization

**Sync Strategy:**
- Initial sync: Bulk operations via Shopify GraphQL
- Real-time: Webhook-driven for orders and customers
- Fallback: Daily cron via Inngest for consistency
- Incremental sync logic planned in `lib/shopify/sync.ts`

**Conflict Resolution:**
- Last-write-wins (timestamp-based)
- shop_id column enables future multi-tenant conflict isolation

---

*Integration audit: 2026-02-19*
