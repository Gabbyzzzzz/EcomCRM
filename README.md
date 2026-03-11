# EcomCRM

Lightweight CRM + marketing automation for Shopify merchants. Syncs customer and order data from your Shopify store, auto-segments customers using RFM scoring, and runs email automation flows — all from a single dashboard.

**Demo**: [ecom-crm-psi.vercel.app](https://ecom-crm-psi.vercel.app/)

## Features

### Dashboard & Analytics
- KPI cards: total customers, revenue, new customers (30d), emails sent
- Customer segment distribution chart (RFM-based)
- Revenue trend (last 90 days)
- Churn alerts for at-risk customers
- Recent activity feed (orders + email events)

### Customer Intelligence
- 360° customer profiles with order history and email engagement
- RFM scoring engine (Recency / Frequency / Monetary) with quintile-based calculation
- 7 auto-segments: Champion, Loyal, Potential, New, At Risk, Hibernating, Lost
- AI-powered customer insights via Claude API
- Advanced filtering, sorting, and tag management

### Email Marketing
- Drag-and-drop email template editor (Unlayer)
- 5 built-in templates: Welcome, Abandoned Cart, Repurchase, Win-back, VIP
- Open / click / conversion tracking with pixel and link rewriting
- Test email sending and template preview

### Automation Engine
- Trigger types: first order, segment change, days since order, tag added, cart abandoned
- Actions: send email, add tag, remove tag
- Per-flow performance metrics (open rate, click rate)
- AI-assisted email copy generation

### Shopify Integration
- OAuth app via Partners Dashboard (client_credentials grant)
- Full sync via `bulkOperationRunQuery` + incremental sync
- Real-time webhooks (orders/create, orders/updated, customers/create, customers/update)
- HMAC-SHA256 webhook verification
- Live sync status indicator in nav

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Recharts |
| Database | PostgreSQL (Supabase) + Drizzle ORM |
| Email | Resend + React Email + Unlayer editor |
| Scheduling | Inngest (cron + event-driven) |
| AI | Claude API (customer insights + copy gen) |
| Shopify | Admin API (GraphQL) via OAuth |
| Deploy | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Shopify Partners Dashboard app
- Resend account with verified domain

### Setup

```bash
git clone <repo-url>
cd ecomcrm
npm install
```

Copy `.env.local.example` to `.env.local` and fill in the values:

```env
# Shopify (Partners Dashboard)
SHOPIFY_STORE_URL=
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
SHOPIFY_WEBHOOK_SECRET=        # same as SHOPIFY_CLIENT_SECRET

# Database
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Email
RESEND_API_KEY=
RESEND_FROM_NAME=
RESEND_FROM_EMAIL=
RESEND_REPLY_TO=               # optional
APP_URL=                       # for unsubscribe links

# AI
ANTHROPIC_API_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seed Email Templates

```bash
npm run seed:templates
```

## Email Sending Setup

EcomCRM uses [Resend](https://resend.com) for email delivery. Before sending, complete these steps:

1. **Verify a sending domain** — use a subdomain like `marketing.your-store.com` to protect your main domain reputation. See [Resend domain docs](https://resend.com/docs/dashboard/domains/introduction).

2. **Add DNS records**:
   - **SPF** (TXT on sending domain): `v=spf1 include:amazonses.com ~all`
   - **DKIM**: auto-configured by Resend during verification
   - **DMARC** (TXT at `_dmarc.your-domain.com`): `v=DMARC1; p=none; rua=mailto:dmarc@your-domain.com`

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/           # dashboard, customers, automations, emails, settings
│   ├── api/                   # API routes (sync, webhooks, customers, automations, tracking)
│   └── unsubscribe/           # email unsubscribe page
├── components/                # shared UI components
├── lib/
│   ├── shopify/               # GraphQL client, sync logic, webhook verification
│   ├── db/                    # Drizzle schema + query helpers
│   ├── rfm/                   # RFM scoring engine
│   ├── automation/            # rule evaluation + action executors
│   ├── email/                 # Resend wrapper
│   └── ai/                    # Claude API integration
├── emails/                    # React Email templates
└── inngest/                   # scheduled sync + automation cron
```

## License

Private.
