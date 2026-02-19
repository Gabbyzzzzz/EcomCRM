# Codebase Structure

**Analysis Date:** 2026-02-19

## Directory Layout

```
ecomcrm/
├── src/
│   ├── app/                           # Next.js App Router (pages + API routes)
│   │   ├── (dashboard)/               # Route group for dashboard pages
│   │   │   └── page.tsx               # Main dashboard landing page
│   │   ├── customers/                 # Customer feature pages
│   │   │   ├── page.tsx               # Customer list with filters
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Customer 360° profile page
│   │   ├── automations/               # Automation feature pages
│   │   │   ├── page.tsx               # Automation flow list
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Workflow editor page
│   │   ├── emails/                    # Email feature pages
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Email template editor page
│   │   ├── api/                       # API Route Handlers
│   │   │   ├── webhooks/
│   │   │   │   └── shopify/           # Shopify webhook receiver
│   │   │   │       └── route.ts
│   │   │   ├── sync/                  # Manual full sync endpoint
│   │   │   │   └── route.ts
│   │   │   ├── customers/             # Customer API endpoints
│   │   │   │   └── route.ts
│   │   │   └── automations/           # Automation API endpoints
│   │   │       └── route.ts
│   │   ├── layout.tsx                 # Root layout (fonts, metadata, providers)
│   │   ├── page.tsx                   # Home/landing page
│   │   ├── globals.css                # Global Tailwind + custom CSS
│   │   └── fonts/                     # Local font files (Geist)
│   │
│   ├── lib/                           # Business logic and utilities
│   │   ├── shopify/                   # Shopify integration layer
│   │   │   ├── client.ts              # GraphQL client wrapper with rate limiting
│   │   │   ├── sync.ts                # Full sync, incremental sync, bulk operations
│   │   │   └── webhooks.ts            # HMAC verification, webhook parsing
│   │   │
│   │   ├── db/                        # Database layer
│   │   │   ├── schema.ts              # Drizzle ORM schema (Customer, Order, Automation, MessageLog)
│   │   │   └── queries.ts             # Reusable query functions
│   │   │
│   │   ├── rfm/                       # RFM segmentation engine
│   │   │   └── engine.ts              # Recency/Frequency/Monetary scoring + segmentation
│   │   │
│   │   ├── automation/                # Automation execution engine
│   │   │   ├── engine.ts              # Trigger evaluation logic
│   │   │   └── actions.ts             # Action executors (send_email, add_tag, remove_tag)
│   │   │
│   │   ├── email/                     # Email service
│   │   │   └── send.ts                # Resend API wrapper
│   │   │
│   │   ├── ai/                        # AI/Claude integration
│   │   │   └── insights.ts            # Claude API for customer analysis + copy generation
│   │   │
│   │   └── utils.ts                   # Shared utilities (cn() for Tailwind classes)
│   │
│   ├── emails/                        # React Email templates
│   │   ├── welcome.tsx
│   │   ├── abandoned-cart.tsx
│   │   ├── repurchase.tsx
│   │   ├── winback.tsx
│   │   └── vip.tsx
│   │
│   ├── components/                    # Shared UI components (to be populated)
│   │   ├── ui/                        # shadcn/ui components (Button, Card, Dialog, etc.)
│   │   ├── dashboard/                 # Dashboard-specific components
│   │   ├── customers/                 # Customer feature components
│   │   ├── automations/               # Automation feature components
│   │   └── emails/                    # Email feature components
│   │
│   └── inngest/                       # Background job orchestration
│       ├── client.ts                  # Inngest client setup
│       └── functions.ts               # Scheduled syncs, automation checks, event handlers
│
├── public/                            # Static assets (images, favicons)
│
├── .planning/
│   └── codebase/                      # GSD codebase analysis documents
│
├── .env.local                         # Environment variables (git-ignored)
├── .gitignore
├── components.json                    # shadcn/ui CLI config
├── next.config.mjs                    # Next.js configuration
├── tsconfig.json                      # TypeScript configuration
├── tailwind.config.ts                 # Tailwind CSS configuration
├── postcss.config.mjs                 # PostCSS configuration
├── package.json                       # Dependencies and scripts
├── package-lock.json                  # Locked dependency versions
├── CLAUDE.md                          # Project specification
├── DECISIONS.md                       # Architecture decisions
└── README.md                          # Project overview
```

## Directory Purposes

**src/app/ (Pages & API Routes):**
- Purpose: Next.js App Router structure with both UI pages and API endpoints
- Contains: Route handlers, page components, layouts, global styles
- Key files: `layout.tsx` (root), `page.tsx` (home), `api/*/route.ts` (endpoints)

**src/lib/ (Business Logic):**
- Purpose: Domain-organized reusable logic, isolated from HTTP/UI concerns
- Contains: Shopify client, database layer, RFM engine, automation engine, email service, AI integration
- Key files: See subdirectories below

**src/lib/shopify/ (Shopify Integration):**
- Purpose: All Shopify API interactions
- Contains: GraphQL client wrapper, bulk operation handling, sync logic, webhook verification
- Key files: `client.ts` (rate-limited GraphQL), `sync.ts` (incremental/full sync), `webhooks.ts` (HMAC verification)

**src/lib/db/ (Database Layer):**
- Purpose: Drizzle ORM schema and reusable queries
- Contains: Schema definitions for Customer, Order, Automation, MessageLog tables
- Key files: `schema.ts` (all table definitions), `queries.ts` (helper functions for common queries)

**src/lib/rfm/ (RFM Segmentation):**
- Purpose: Customer segmentation calculations
- Contains: Recency/Frequency/Monetary scoring, quintile-based ranking, segment mapping
- Key files: `engine.ts` (RFM calculation and segmentation logic)

**src/lib/automation/ (Automation Engine):**
- Purpose: Trigger evaluation and action execution
- Contains: Rule matching logic, pluggable action handlers
- Key files: `engine.ts` (trigger evaluation), `actions.ts` (execute send_email, add_tag, remove_tag)

**src/lib/email/ (Email Service):**
- Purpose: Email delivery and Resend integration
- Contains: Resend SDK wrapper, template selection
- Key files: `send.ts` (Resend API calls)

**src/lib/ai/ (AI Integration):**
- Purpose: Claude API for customer insights and copy generation
- Contains: Anthropic SDK calls
- Key files: `insights.ts` (customer analysis, email body generation)

**src/components/ (UI Components):**
- Purpose: Shared React components across pages
- Contains: shadcn/ui components, feature-specific component modules
- Key subdirectories: `ui/` (button, card, dialog, etc.), `dashboard/`, `customers/`, `automations/`, `emails/`

**src/emails/ (Email Templates):**
- Purpose: React Email template components for automation workflows
- Contains: TSX files for welcome, abandoned cart, repurchase, win-back, VIP emails
- Key files: `welcome.tsx`, `abandoned-cart.tsx`, `repurchase.tsx`, `winback.tsx`, `vip.tsx`

**src/inngest/ (Background Jobs):**
- Purpose: Scheduled and event-driven task execution via Inngest
- Contains: Client setup, scheduled functions (daily sync), automation checks
- Key files: `client.ts` (Inngest client), `functions.ts` (sync schedule, automation triggers)

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout with fonts, metadata, and HTML structure
- `src/app/page.tsx`: Home/landing page
- `src/app/(dashboard)/page.tsx`: Main dashboard page (after login)

**Configuration:**
- `tsconfig.json`: TypeScript compiler options, path aliases (`@/*` → `src/*`)
- `tailwind.config.ts`: Tailwind theming (colors, border-radius)
- `components.json`: shadcn/ui CLI config (component output paths, aliases)
- `next.config.mjs`: Next.js configuration

**Core Logic:**
- `src/lib/shopify/client.ts`: GraphQL client for Shopify Admin API
- `src/lib/shopify/sync.ts`: Full and incremental sync logic
- `src/lib/db/schema.ts`: Drizzle ORM table definitions
- `src/lib/rfm/engine.ts`: RFM scoring and segmentation
- `src/lib/automation/engine.ts`: Trigger evaluation engine
- `src/lib/automation/actions.ts`: Action executors
- `src/lib/email/send.ts`: Resend email delivery

**API Routes:**
- `src/app/api/webhooks/shopify/route.ts`: Webhook receiver (POST)
- `src/app/api/sync/route.ts`: Manual sync endpoint (POST)
- `src/app/api/customers/route.ts`: Customer API (GET, POST, PUT, DELETE)
- `src/app/api/automations/route.ts`: Automation API (GET, POST, PUT, DELETE)

**Background Jobs:**
- `src/inngest/functions.ts`: Scheduled sync (daily cron), automation checks, event handlers

## Naming Conventions

**Files:**
- Page components: `page.tsx` (automatic routing in App Router)
- API routes: `route.ts` in `api/` directory
- React components: PascalCase (e.g., `CustomerCard.tsx`, `AutomationForm.tsx`)
- Utilities/services: camelCase (e.g., `utils.ts`, `sync.ts`, `engine.ts`)
- React Email templates: camelCase with .tsx extension (e.g., `welcome.tsx`)
- Schema/database: camelCase (e.g., `schema.ts`, `queries.ts`)

**Directories:**
- Feature-based: Lowercase plural (e.g., `customers/`, `automations/`, `emails/`)
- Layer-based: Lowercase (e.g., `api/`, `lib/`, `components/`, `inngest/`)
- Route groups (grouping without URL segment): Parentheses (e.g., `(dashboard)/`)

**Functions:**
- camelCase with descriptive verb-noun pattern
- Examples: `syncCustomer()`, `calculateRFM()`, `evaluateTrigger()`, `sendEmail()`

**Types/Interfaces:**
- PascalCase with `T` prefix optional (e.g., `Customer`, `TAutomation`, `MessageLog`)
- Discriminated unions for polymorphic types (e.g., `TriggerType = "first_order" | "segment_change"`)

**Variables:**
- camelCase for local variables
- UPPER_SNAKE_CASE for constants (e.g., `API_KEY`, `RATE_LIMIT`)
- Use `const` by default; `let` only when reassignment necessary

## Where to Add New Code

**New Feature (e.g., analytics page):**
- Primary code: `src/app/[feature]/page.tsx` (page component)
- API logic: `src/app/api/[feature]/route.ts` (if needs API)
- Service layer: `src/lib/[feature]/engine.ts` or `queries.ts` (business logic)
- Components: `src/components/[feature]/*.tsx` (reusable UI)
- Tests: `src/app/[feature]/*.test.ts` or `src/lib/[feature]/*.test.ts`

**New Component/Module:**
- Implementation: `src/components/[category]/ComponentName.tsx` (UI) or `src/lib/[domain]/module.ts` (logic)
- Export from barrel file: `src/components/[category]/index.ts` (if multiple components)
- Tests: Co-located as `ComponentName.test.tsx` or `module.test.ts`

**Utilities:**
- Shared helpers: `src/lib/utils.ts` (if general purpose)
- Domain-specific helpers: `src/lib/[domain]/helpers.ts` (if tied to a domain)
- Example: Tailwind class utilities go in `src/lib/utils.ts` and imported via `@/lib/utils`

**API Endpoints:**
- Location: `src/app/api/[resource]/route.ts`
- Pattern: `export async function GET/POST/PUT/DELETE(request: Request) { ... }`
- Validation: Always validate request body with Zod before processing
- Error handling: Return appropriate HTTP status codes (400, 401, 404, 500)

**Background Jobs:**
- Location: `src/inngest/functions.ts`
- Pattern: Define Inngest function with cron expression or event trigger
- Example: `export const syncDaily = inngest.createFunction({id: 'sync-daily'}, {cron: '0 2 * * *'}, async () => { ... })`

**Database Changes:**
- Schema: Add table/column to `src/lib/db/schema.ts`
- Migrations: Run `drizzle-kit generate` to generate migration files
- Queries: Add helper functions to `src/lib/db/queries.ts` for new tables/queries

**Email Templates:**
- Location: `src/emails/[templateName].tsx`
- Pattern: React functional component that accepts props, returns JSX using @react-email/components
- Usage: Import in `src/lib/email/send.ts` and render with React Email's `render()` function

## Special Directories

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes (via `npm install`)
- Committed: No (in .gitignore)

**public/:**
- Purpose: Static assets served by Next.js
- Generated: No (manually created)
- Committed: Yes (version control for images, favicons)

**public/favicon.ico:**
- App favicon (currently default Next.js favicon)

**.next/:**
- Purpose: Next.js build output and cache
- Generated: Yes (via `npm run build` or `next dev`)
- Committed: No (in .gitignore)

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by mapper agent)
- Committed: Yes (reference for planning)

**.env.local:**
- Purpose: Environment variables (secrets, API keys, URLs)
- Generated: No (manually created for dev)
- Committed: No (in .gitignore for security)
- Required vars: SHOPIFY_STORE_URL, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_WEBHOOK_SECRET, DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, ANTHROPIC_API_KEY, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY

---

*Structure analysis: 2026-02-19*
