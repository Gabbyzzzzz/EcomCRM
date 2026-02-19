# Architecture

**Analysis Date:** 2026-02-19

## Pattern Overview

**Overall:** Next.js 14 Server Components with modular feature-based layers

**Key Characteristics:**
- App Router (not Pages Router) with Server Components as default
- Layered architecture: Presentation → API Routes → Business Logic → Data Access
- Feature-based file organization (customers, automations, emails, etc.)
- Separation of concerns: API layer, service layer, database layer
- Event-driven task scheduling via Inngest for background jobs
- Zod validation on all API inputs (type-safe at runtime)

## Layers

**Presentation Layer (UI):**
- Purpose: React Server Components and Client Components for dashboard UI
- Location: `src/app/(dashboard)/`, `src/app/customers/`, `src/app/automations/`, `src/app/emails/`
- Contains: Page components (.tsx), layout components, shared UI via shadcn/ui
- Depends on: Service layer via API routes and direct database queries (server components)
- Used by: Browser clients
- Default pattern: Server Components for data fetching and rendering

**API Layer:**
- Purpose: HTTP endpoints for frontend requests and webhooks
- Location: `src/app/api/`
- Contains: Route handlers (`route.ts`), webhook endpoints, request validation
- Depends on: Service layer, database layer
- Used by: Frontend components, external webhooks (Shopify), Inngest functions

**Service/Business Logic Layer:**
- Purpose: Core business logic isolated from HTTP concerns
- Location: `src/lib/` (organized by domain: shopify, db, rfm, automation, email, ai)
- Contains:
  - Shopify integration (`src/lib/shopify/`) - GraphQL client, sync logic, webhook verification
  - RFM engine (`src/lib/rfm/`) - customer segmentation calculations
  - Automation engine (`src/lib/automation/`) - trigger evaluation, action execution
  - Email service (`src/lib/email/`) - Resend integration, template rendering
  - AI service (`src/lib/ai/`) - Claude API calls for customer insights
- Depends on: Data layer, external APIs (Shopify, Resend, Anthropic)
- Used by: API routes, Inngest functions

**Data Access Layer:**
- Purpose: Database interactions and queries
- Location: `src/lib/db/`
- Contains: Drizzle schema definitions (`schema.ts`), reusable query functions (`queries.ts`)
- Depends on: PostgreSQL via Supabase
- Used by: Service layer and Server Components

**Background Job Layer:**
- Purpose: Scheduled and event-driven task execution
- Location: `src/inngest/`
- Contains: Inngest client setup (`client.ts`), scheduled sync functions, automation checks (`functions.ts`)
- Depends on: Service layer, database layer
- Used by: Inngest event queue

**Shared Utilities:**
- Purpose: Cross-cutting helper functions
- Location: `src/lib/utils.ts`
- Contains: Tailwind class utilities (`cn()` function using clsx + tailwind-merge)
- Used by: All components

## Data Flow

**Customer Data Synchronization:**

1. Shopify webhook received at `src/app/api/webhooks/shopify/` endpoint
2. HMAC verification using `SHOPIFY_WEBHOOK_SECRET`
3. Event passed to `src/lib/shopify/sync.ts` for incremental sync
4. Customer/Order data inserted/updated in PostgreSQL via Drizzle ORM in `src/lib/db/queries.ts`
5. RFM scores recalculated by `src/lib/rfm/engine.ts`
6. Customer segment updated in database
7. MessageLog created if triggered actions execute

**Automation Execution:**

1. Inngest cron job or event trigger invokes function in `src/inngest/functions.ts`
2. Automation rules fetched from database
3. `src/lib/automation/engine.ts` evaluates trigger conditions against customer state
4. If trigger matches, action is queued (e.g., send email)
5. `src/lib/automation/actions.ts` executes action (calls Resend, updates tags, etc.)
6. MessageLog entry created to track execution

**Manual Full Sync:**

1. User initiates sync via `src/app/api/sync/` endpoint
2. `src/lib/shopify/client.ts` runs `bulkOperationRunQuery` for full customer/order pull
3. Batch inserts into database with idempotency checks
4. RFM engine recalculates all segments
5. Response returned to frontend with sync stats

**State Management:**

- Database is single source of truth for customer state, orders, automations, message logs
- RFM scores persisted in `customers` table (rfm_r, rfm_f, rfm_m, segment columns)
- Automation trigger state is stateless - evaluated each execution based on current customer data
- Message tracking in MessageLog for lifecycle events (sent, opened, clicked, converted)

## Key Abstractions

**Shopify Adapter:**
- Purpose: Encapsulate all Shopify API interactions
- Examples: `src/lib/shopify/client.ts`, `src/lib/shopify/sync.ts`, `src/lib/shopify/webhooks.ts`
- Pattern: GraphQL client wrapper for cost-based rate limiting, bulk operation helpers, webhook verification with HMAC-SHA256

**RFM Engine:**
- Purpose: Encapsulate customer segmentation logic
- Examples: `src/lib/rfm/engine.ts`
- Pattern: Quintile-based scoring (adaptive per store), segment mapping (champion/loyal/at-risk/etc.), triggered by order events and daily cron

**Automation Engine:**
- Purpose: Decoupled trigger evaluation and action execution
- Examples: `src/lib/automation/engine.ts`, `src/lib/automation/actions.ts`
- Pattern: Immutable rule evaluation, pluggable action handlers (send_email, add_tag, remove_tag), logging to MessageLog

**Email Service:**
- Purpose: Abstract email rendering and delivery
- Examples: `src/lib/email/send.ts`, `src/emails/*.tsx`
- Pattern: React Email templates in `src/emails/`, Resend SDK wrapper, template selection by automation action

**Validation Boundary:**
- Purpose: Type-safe input validation using Zod
- Pattern: All API routes validate request bodies with Zod schemas before processing
- Example: `zod.object({ email: z.string().email() })`

## Entry Points

**Web Application:**
- Location: `src/app/layout.tsx` (Root Layout), `src/app/page.tsx` (Home)
- Triggers: Browser navigation to `/`
- Responsibilities: Initialize app structure, fonts, metadata, root layout wrapping

**Dashboard Pages:**
- Location: `src/app/(dashboard)/page.tsx` (main dashboard), `src/app/customers/page.tsx` (customer list), `src/app/customers/[id]/page.tsx` (customer profile), `src/app/automations/page.tsx`, `src/app/automations/[id]/page.tsx`, `src/app/emails/[id]/page.tsx`
- Triggers: User navigation within app
- Responsibilities: Fetch data via server queries, render UI, delegate interactivity to Client Components

**Shopify Webhook Endpoint:**
- Location: `src/app/api/webhooks/shopify/route.ts`
- Triggers: Shopify webhook POST events (orders/created, orders/updated, customers/create, customers/update)
- Responsibilities: Verify HMAC, parse event, delegate to sync service, respond with 200 OK

**Manual Sync Endpoint:**
- Location: `src/app/api/sync/route.ts`
- Triggers: User-initiated sync request from dashboard
- Responsibilities: Call full sync via Shopify bulk operation, return sync results

**Inngest Background Jobs:**
- Location: `src/inngest/functions.ts`
- Triggers: Scheduled cron expressions (daily sync), event-driven (order.created, customer.segmented)
- Responsibilities: Execute background tasks (sync, automation checks) with retry handling and idempotency

## Error Handling

**Strategy:** Try-catch with specific error types, graceful degradation on external API failures

**Patterns:**
- API routes catch errors and return 400/500 with error details to client
- Inngest functions use built-in retry logic (exponential backoff) for transient failures
- Webhook endpoints verify HMAC first; invalid requests return 401 before processing
- Shopify rate limit errors trigger exponential backoff in `src/lib/shopify/client.ts`
- Database errors propagate to API route handlers with appropriate HTTP status codes
- Email sending failures do not block automation execution; logged to MessageLog with status "failed"

## Cross-Cutting Concerns

**Logging:**
- Use `console.log()` and `console.error()` for development
- Inngest SDK provides structured logging for background jobs
- MessageLog table tracks email campaign metrics (sent/opened/clicked/converted)

**Validation:**
- All API inputs validated with Zod schemas before processing
- Database layer uses Drizzle column constraints (NOT NULL, UNIQUE, etc.)
- Shopify webhook HMAC verification on every webhook endpoint

**Authentication:**
- Not yet implemented (in-progress)
- Will use Next.js Auth.js or similar
- Expected to protect dashboard routes behind login
- API routes may require Authorization header or session token

**Idempotency:**
- Shopify sync uses `shopify_id` as unique identifier to prevent duplicate inserts
- Inngest functions have built-in idempotency via event deduplication
- Webhook processing checks if order/customer already exists before upsert

---

*Architecture analysis: 2026-02-19*
