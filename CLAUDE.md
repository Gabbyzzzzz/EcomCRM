# CLAUDE.md

## What is this
EcomCRM — a lightweight CRM + marketing automation tool for Shopify merchants. Connects to a real Shopify store via OAuth app (Partners Dashboard, not Custom App), syncs customer/order data, auto-segments customers using RFM scoring, and runs email automation flows.

## Tech Stack
- **Framework**: Next.js 14 (App Router) + TypeScript (strict)
- **UI**: Tailwind CSS + shadcn/ui
- **DB**: PostgreSQL via Supabase + Drizzle ORM
- **Task scheduling**: Inngest (cron jobs + event-driven functions)
- **Email**: Resend + React Email (templates)
- **AI**: Claude API (customer insights + copy generation)
- **Shopify**: Admin API (GraphQL) via OAuth app (Partners Dashboard)
- **Charts**: Recharts
- **Deploy**: Vercel

## Project Structure
```
src/
├── app/
│   ├── (dashboard)/          # main dashboard page
│   ├── customers/
│   │   ├── page.tsx          # customer list with filters
│   │   └── [id]/page.tsx     # customer 360° profile
│   ├── automations/
│   │   ├── page.tsx          # automation flow list
│   │   └── [id]/page.tsx     # workflow editor
│   ├── emails/
│   │   └── [id]/page.tsx     # email template editor
│   └── api/
│       ├── webhooks/shopify/  # receive shopify webhooks
│       ├── sync/              # manual/scheduled sync
│       ├── customers/
│       └── automations/
├── lib/
│   ├── shopify/
│   │   ├── client.ts         # GraphQL client wrapper
│   │   ├── sync.ts           # full + incremental sync logic
│   │   └── webhooks.ts       # HMAC verification
│   ├── db/
│   │   ├── schema.ts         # Drizzle schema definitions
│   │   └── queries.ts        # reusable query functions
│   ├── rfm/
│   │   └── engine.ts         # RFM calculation + segmentation
│   ├── automation/
│   │   ├── engine.ts         # rule evaluation engine
│   │   └── actions.ts        # action executors (send email, add tag, etc.)
│   ├── email/
│   │   └── send.ts           # Resend wrapper
│   └── ai/
│       └── insights.ts       # Claude API for customer analysis
├── emails/                    # React Email templates
│   ├── welcome.tsx
│   ├── abandoned-cart.tsx
│   ├── repurchase.tsx
│   ├── winback.tsx
│   └── vip.tsx
├── components/                # shared UI components
└── inngest/
    ├── client.ts
    └── functions.ts           # scheduled sync, automation checks
```

## Data Models (Drizzle schema)
- **Customer**: shopify_id, name, email, phone, rfm_r, rfm_f, rfm_m, segment (enum: champion/loyal/potential/new/at_risk/hibernating/lost), lifecycle_stage, tags (text[]), total_spent (decimal), order_count, avg_order_value, first_order_at, last_order_at, created_at
- **Order**: shopify_id, customer_id (FK), total_price (decimal), line_items (jsonb), financial_status, created_at
- **Automation**: name, trigger_type (enum), trigger_config (jsonb), delay_value, delay_unit, action_type (enum), action_config (jsonb), email_template_id, enabled (boolean), last_run_at
- **MessageLog**: customer_id (FK), automation_id (FK), channel (email/sms), subject, status (sent/opened/clicked/converted), sent_at, opened_at, clicked_at

All tables include shop_id column (for future multi-tenant support).

## Shopify Integration
- Auth: OAuth app from Partners Dashboard. Token obtained via manual OAuth exchange — NOT a Custom App static token
- `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` in env (Partners Dashboard credentials — used via OAuth client credentials grant to obtain access tokens at runtime)
- Store URL in env var `SHOPIFY_STORE_URL`
- Initial sync: use `bulkOperationRunQuery` for full pull
- Real-time: Webhooks for orders/create, orders/updated, customers/create, customers/update
- Webhook verification: HMAC-SHA256 using `SHOPIFY_WEBHOOK_SECRET` = `SHOPIFY_CLIENT_SECRET` (Partners Dashboard client secret, not a separate webhook secret)
- Handle rate limits: cost-based throttling for GraphQL
- Money fields: always use string/decimal, never float

## RFM Engine
- R (Recency): days since last order → score 1-5 (reverse: fewer days = higher score)
- F (Frequency): total order count → score 1-5
- M (Monetary): total spent → score 1-5
- Scoring method: quintile-based on all customers in the store (adaptive, no fixed thresholds)
- Segment mapping: RFM score combo → segment label (champion, loyal, at_risk, etc.)
- Recalculate: on each order event + daily cron as fallback

## Automation Engine
Trigger types: first_order, segment_change, days_since_order, tag_added, cart_abandoned
Action types: send_email, add_tag, remove_tag
Flow: trigger fires → check delay → execute action → log to MessageLog

## Coding Rules
- TypeScript strict, no `any`
- Server Components by default, Client Components only when interactive
- All API inputs validated with zod
- Use Drizzle query builder, not raw SQL
- Decimal for all money values
- Webhook endpoints must verify HMAC before processing
- All secrets in .env.local, never hardcoded
- Inngest functions handle retries and idempotency

## Env Vars Needed
```
SHOPIFY_STORE_URL=
SHOPIFY_CLIENT_ID=           # Partners Dashboard client ID
SHOPIFY_CLIENT_SECRET=       # Partners Dashboard client secret
SHOPIFY_WEBHOOK_SECRET=      # Same value as SHOPIFY_CLIENT_SECRET
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
ANTHROPIC_API_KEY=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```
