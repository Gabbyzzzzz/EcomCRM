# Codebase Concerns

**Analysis Date:** 2026-02-19

## Critical Implementation Gap

**Specification vs. Reality:**
- Issue: CLAUDE.md specifies a fully-featured EcomCRM system with Shopify integration, database schema, RFM engine, automation flows, and email capabilities. Current codebase contains only Next.js 14 scaffolding with no feature implementation.
- Files: `src/app/page.tsx`, `src/app/layout.tsx`, `src/lib/utils.ts` (boilerplate only)
- Impact: No business logic exists. All major features listed in CLAUDE.md (customers, automations, emails, analytics, Shopify sync) are unimplemented. Project cannot function without this implementation.
- Fix approach: Implement features in phases as defined in system prompts. Start with core database schema (`src/lib/db/schema.ts`), then Shopify client (`src/lib/shopify/client.ts`), then API endpoints and UI pages.

## Missing Core Infrastructure

**Database Layer:**
- Missing: `src/lib/db/schema.ts`, `src/lib/db/queries.ts` - Drizzle ORM schema and query utilities
- Impact: Cannot store or retrieve customer, order, automation, or message log data. All features depend on this.
- Blocks: RFM engine, automation engine, sync logic, all API endpoints

**Shopify Integration:**
- Missing: `src/lib/shopify/client.ts`, `src/lib/shopify/sync.ts`, `src/lib/shopify/webhooks.ts`
- Impact: Cannot connect to Shopify stores or sync customer/order data. This is the foundational feature for the entire platform.
- Blocks: Customer management, order tracking, webhook handling, all downstream features

**Task Scheduling:**
- Missing: `src/inngest/client.ts`, `src/inngest/functions.ts`
- Impact: Cannot schedule recurring RFM recalculation, automation checks, or batch sync operations.
- Blocks: Reliable customer segmentation, email automation delivery, background job management

## Security & Configuration Risks

**Secrets Management:**
- Risk: CLAUDE.md lists 11 required environment variables (SHOPIFY_STORE_URL, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_WEBHOOK_SECRET, DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, ANTHROPIC_API_KEY, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY)
- Current: No `.env.local` template or documentation of required vars in codebase
- Missing: No validation that all required env vars are present at startup
- Current mitigation: None. Project will fail at runtime if any var is missing.
- Recommendations: Create `.env.example` file listing all required variables. Add validation in `src/lib/config.ts` that checks all vars at startup. Document secrets management in CLAUDE.md.

**Webhook Verification:**
- Missing: HMAC-SHA256 verification logic in `src/lib/shopify/webhooks.ts`
- Impact: Shopify webhook endpoints (`src/app/api/webhooks/shopify/*`) will be vulnerable to spoofed requests if implemented without HMAC checks.
- Current mitigation: None.
- Recommendations: Implement HMAC verification before processing any webhook payload. Use `SHOPIFY_WEBHOOK_SECRET` env var.

**API Validation:**
- Risk: CLAUDE.md specifies "All API inputs validated with zod" but no validation schema files exist
- Current: No validation in any API routes (none exist yet)
- Impact: Future API endpoints will be vulnerable to malformed/malicious input if validation is skipped
- Recommendations: Create zod schemas for all API endpoints before implementation. Validate all user input at route handlers.

## Type Safety Gaps

**TypeScript Configuration:**
- Current: `tsconfig.json` has `strict: true` which is correct per CLAUDE.md
- Gap: No path aliases beyond `@/*` for commonly imported modules (e.g., `@/lib/db`, `@/lib/shopify`)
- Fix: Add aliases in tsconfig.json for `@/lib/db`, `@/lib/shopify`, `@/components`, etc. to simplify imports across codebase

**Missing Type Definitions:**
- Files: None exist for Shopify API responses, RFM calculations, automation triggers, email templates
- Impact: Without type definitions, developers will write untyped code or use `any`, defeating strict TypeScript
- Fix: Create comprehensive type files: `src/lib/shopify/types.ts`, `src/lib/rfm/types.ts`, `src/lib/automation/types.ts`

## Database & Schema Concerns

**Multi-tenancy Preparation:**
- CLAUDE.md notes: "All tables include shop_id column (for future multi-tenant support)"
- Gap: No tenant isolation logic, middleware, or verification that all queries filter by shop_id
- Risk: Early implementation without this discipline will create security vulnerabilities later
- Current mitigation: None.
- Recommendations: Before implementing API endpoints, establish pattern: all database queries must accept and filter by `shop_id`. Create helper function to extract shop_id from request context.

**Decimal Money Handling:**
- CLAUDE.md specifies: "Money fields: always use string/decimal, never float"
- Gap: No utility functions or types to enforce this
- Impact: Developers may accidentally use number types for prices, causing floating-point precision errors
- Recommendations: Create type definitions for money values: `type Money = Decimal | string`. Create helper functions for money formatting/parsing.

**Drizzle Migration Missing:**
- Current: No `drizzle.config.ts`, migrations folder, or schema generation
- Gap: Cannot initialize database or deploy schema changes
- Recommendations: Create `drizzle.config.ts` after schema is written. Set up migration folder at `src/lib/db/migrations`.

## Testing & Quality Gaps

**No Test Infrastructure:**
- Missing: Jest/Vitest config, test files, fixtures, mocking setup
- Current: Only 5 lines of utility code; no tests for any logic
- Impact: Once feature implementation begins, there's no testing framework in place
- Recommendations: Initialize testing before feature implementation. Create `jest.config.js` and sample test files. Establish test patterns for API routes, database queries, RFM calculations.

**No Linting Configuration:**
- Missing: `.eslintrc.json` or eslint.config.js
- Gap: Code style will be inconsistent. No enforcement of naming conventions specified in CLAUDE.md
- Recommendations: Initialize ESLint with Next.js plugin. Create `.eslintrc.json` with rules for naming patterns (camelCase functions, PascalCase components, etc.).

**No API Documentation:**
- Missing: OpenAPI spec, JSDoc comments, endpoint documentation
- Impact: As API endpoints are built, there's no systematic documentation
- Recommendations: Add JSDoc comments to all API route handlers. Consider adding Swagger/OpenAPI documentation.

## Dependency Management Issues

**shadcn/ui Not Installed:**
- CLAUDE.md lists: "UI: Tailwind CSS + shadcn/ui"
- Current: No shadcn/ui components, no `components.json` config (exists but empty)
- Gap: UI pages (`src/app/customers/page.tsx`, `src/app/automations/page.tsx`, etc.) cannot be built without shadcn components
- Recommendations: Run `npx shadcn-ui@latest init` to properly initialize shadcn/ui before building UI pages.

**React Email Templates Missing:**
- Missing: `src/emails/*.tsx` (5 email templates specified: welcome, abandoned-cart, repurchase, winback, vip)
- Impact: Automation engine cannot send templated emails
- Recommendations: Create React Email component files and test templates before automation implementation.

**Drizzle Migrations Not Set Up:**
- Current: Drizzle ORM dependency exists in package.json, but no drizzle-kit config or migration scripts
- Gap: Database schema cannot be deployed or versioned
- Recommendations: Create `drizzle.config.ts`. Set up `src/lib/db/migrations/` folder. Add migration scripts to package.json.

## Performance & Scaling Concerns

**Shopify GraphQL Rate Limiting:**
- CLAUDE.md specifies: "Handle rate limits: cost-based throttling for GraphQL"
- Missing: No rate limiting implementation, throttling queue, or backoff logic
- Impact: Full sync of large customer/order datasets may hit rate limits and fail without retry logic
- Recommendations: Implement exponential backoff, request queuing, and rate-limit header monitoring in `src/lib/shopify/client.ts`.

**RFM Recalculation at Scale:**
- CLAUDE.md specifies: "Recalculate: on each order event + daily cron as fallback"
- Gap: No implementation yet, but quintile-based scoring on all customers is computationally expensive
- Risk: As customer base grows, daily cron job could timeout or lock database
- Current mitigation: None.
- Recommendations: When implementing, consider batch processing RFM scores in chunks. Monitor query performance on tables with 10k+ customers.

**Initial Sync Performance:**
- CLAUDE.md specifies: "Initial sync: use `bulkOperationRunQuery` for full pull"
- Gap: No implementation. Large Shopify stores (100k+ customers/orders) may timeout with naive pagination
- Recommendations: Implement cursor-based pagination, handle ECONNRESET errors, persist sync progress so interrupted syncs can resume.

## Missing Features (Specification Compliance)

**RFM Engine:**
- Missing: `src/lib/rfm/engine.ts` - Complete RFM calculation logic
- What's not tested: RFM score calculation, quintile computation, segment mapping, threshold handling for stores with <5 customers

**Automation Engine:**
- Missing: `src/lib/automation/engine.ts`, `src/lib/automation/actions.ts`
- Not implemented: Trigger evaluation (first_order, segment_change, days_since_order, tag_added, cart_abandoned), delay handling, action execution

**Customer Analytics & AI:**
- Missing: `src/lib/ai/insights.ts` - Claude API integration for customer insights
- Not implemented: Any AI-powered features for customer analysis or copy generation

**Email Sending:**
- Missing: `src/lib/email/send.ts` - Resend wrapper
- Not implemented: Message logging, delivery tracking, open/click metrics

**API Endpoints:**
- Missing: All endpoints listed in CLAUDE.md project structure:
  - `src/app/api/webhooks/shopify/*` - No Shopify webhook handlers
  - `src/app/api/sync/*` - No manual/scheduled sync endpoint
  - `src/app/api/customers/*` - No customer management API
  - `src/app/api/automations/*` - No automation API

**UI Pages:**
- Missing: All dashboard and feature pages:
  - `src/app/(dashboard)/page.tsx` - Dashboard page
  - `src/app/customers/page.tsx`, `src/app/customers/[id]/page.tsx` - Customer list & profile
  - `src/app/automations/page.tsx`, `src/app/automations/[id]/page.tsx` - Automation flows
  - `src/app/emails/[id]/page.tsx` - Email template editor

## Breaking Changes & Refactoring Risks

**No Error Handling Pattern:**
- Missing: Centralized error handling, custom error classes, consistent error responses
- Impact: As features are implemented, error handling will be inconsistent unless pattern is established first
- Recommendations: Create `src/lib/errors.ts` with custom error classes before implementing features.

**No Logging Infrastructure:**
- Missing: Structured logging setup, log levels, log destinations
- Impact: Debugging production issues (Shopify sync failures, automation engine bugs) will be difficult without consistent logging
- Recommendations: Initialize logging library (winston, pino, or Vercel native) before major feature implementation.

**No Middleware for Request Context:**
- Missing: Middleware to extract shop_id, auth user, request metadata
- Impact: Required for multi-tenant isolation and security. Should be established before any API endpoints.
- Recommendations: Create `src/middleware.ts` to validate auth and attach shop context to requests.

## Technical Debt Prevention

**Future Shopify API Changes:**
- Risk: Shopify API versions may change. Current plan hardcodes to "Custom App" model.
- Mitigation: Keep Shopify client code isolated in `src/lib/shopify/` for easy updates.
- Recommendations: Add version negotiation to `src/lib/shopify/client.ts` to handle API version changes gracefully.

**Email Provider Lock-in:**
- Risk: Using Resend for email. Switching providers would require refactoring `src/lib/email/send.ts` and all templates.
- Mitigation: Abstract email sending behind interface in `src/lib/email/send.ts`.
- Recommendations: Create email adapter pattern to support provider switching without UI changes.

---

*Concerns audit: 2026-02-19*
