# Technology Stack
     2→
     3→**Analysis Date:** 2026-02-19
     4→
     5→## Languages
     6→
     7→**Primary:**
     8→- TypeScript 5.x - Strict mode across entire codebase
     9→- JavaScript (JSX/TSX) - React and Next.js components
    10→
    11→**Secondary:**
    12→- CSS (Tailwind directives) - Styling via Tailwind CSS
    13→- MDX/Markdown - Configuration files (postcss.config.mjs, next.config.mjs)
    14→
    15→## Runtime
    16→
    17→**Environment:**
    18→- Node.js (compatible with Next.js 14.2.35, tested with npm)
    19→
    20→**Package Manager:**
    21→- npm
    22→- Lockfile: `package-lock.json` (present)
    23→
    24→## Frameworks
    25→
    26→**Core:**
    27→- Next.js 14.2.35 - App Router (required: TypeScript strict, no older Pages Router)
    28→- React 18.x - Server and Client Components
    29→
    30→**UI & Styling:**
    31→- Tailwind CSS 3.4.1 - Utility-first CSS framework
    32→- tailwindcss-animate 1.0.7 - Animation utilities
    33→- tailwind-merge 3.4.1 - Utility class deduplication
    34→- shadcn/ui - Component library (configured in `components.json`, uses lucide icons)
    35→- lucide-react 0.574.0 - Icon library
    36→
    37→**Component Utilities:**
    38→- class-variance-authority 0.7.1 - Component variant system
    39→- clsx 2.1.1 - Conditional className builder
    40→
    41→**Testing:**
    42→- Not detected in dependencies
    43→
    44→**Build/Dev:**
    45→- TypeScript 5.x - Type checking
    46→- drizzle-kit 0.31.9 - ORM migrations and schema generation
    47→- PostCSS 8.x - CSS preprocessing (Tailwind)
    48→
    49→## Key Dependencies
    50→
    51→**Critical:**
    52→- drizzle-orm 0.45.1 - Type-safe ORM for database queries (PostgreSQL via Supabase)
    53→- postgres 3.4.8 - PostgreSQL client for connection pooling and driver
    54→- zod 4.3.6 - Runtime schema validation for API inputs
    55→- @supabase/supabase-js 2.97.0 - Supabase client for database access
    56→
    57→**Task Scheduling & Serverless:**
    58→- inngest 3.52.1 - Event-driven task scheduling (cron jobs, automation engine)
    59→
    60→**Email & Notifications:**
    61→- resend 6.9.2 - Email delivery service
    62→- @react-email/components 1.0.8 - React-based email template components
    63→
    64→**Charts & Visualization:**
    65→- recharts 3.7.0 - React charting library for RFM analytics and customer insights
    66→
    67→**AI & LLM:**
    68→- @anthropic-ai/sdk 0.76.0 - Anthropic Claude API for customer insights and copy generation
    69→
    70→**UI Utilities:**
    71→- lucide-react 0.574.0 - SVG icon library (consistent with shadcn/ui)
    72→
    73→## Configuration
    74→
    75→**Environment:**
    76→- Environment variables stored in `.env.local` (not committed to git)
    77→- Verified env vars required:
    78→  - `SHOPIFY_STORE_URL` - Shopify store domain
    79→  - `SHOPIFY_ACCESS_TOKEN` - Custom App API token
    80→  - `SHOPIFY_WEBHOOK_SECRET` - HMAC secret for webhook verification
    81→  - `DATABASE_URL` - PostgreSQL connection string
    82→  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
    83→  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
    84→  - `RESEND_API_KEY` - Resend email service API key
    85→  - `ANTHROPIC_API_KEY` - Claude API key
    86→  - `INNGEST_EVENT_KEY` - Inngest event signing key
    87→  - `INNGEST_SIGNING_KEY` - Inngest webhook signing key
    88→
    89→**Build:**
    90→- `next.config.mjs` - Next.js build configuration (default/minimal)
    91→- `tsconfig.json` - TypeScript compiler with:
    92→  - `"strict": true` - Strict type checking
    93→  - `"noEmit": true` - Type checking only, no emit
    94→  - `"moduleResolution": "bundler"` - Modern module resolution
    95→  - Path alias: `@/*` → `./src/*`
    96→- `postcss.config.mjs` - PostCSS with Tailwind CSS plugin
    97→- `tailwind.config.ts` - Tailwind configuration with:
    98→  - dark mode via class toggle
    99→  - shadcn/ui color system (HSL variables)
   100→  - Extended theme colors for charts
   101→  - tailwindcss-animate plugin
   102→
   103→**Component Configuration:**
   104→- `components.json` - shadcn/ui configuration:
   105→  - Style: "new-york"
   106→  - RSC (React Server Components): enabled
   107→  - Icon library: lucide
   108→  - Base color: neutral
   109→  - CSS variables: enabled
   110→  - Aliases configured for components, utils, ui, lib, hooks
   111→
   112→## Platform Requirements
   113→
   114→**Development:**
   115→- Node.js 18+ (compatible with Next.js 14)
   116→- npm 8+ or equivalent
   117→- Terminal access for git and build tools
   118→
   119→**Production:**
   120→- Deployment target: Vercel (primary)
   121→- Alternative: Any Node.js 18+ hosting supporting Next.js 14 SSR + API routes
   122→- Database: PostgreSQL 13+ (via Supabase)
   123→- Secrets: `.env.local` file with all credentials before deployment
   124→
   125→**Runtime Constraints:**
   126→- Money fields must use Decimal types (not float) per CLAUDE.md
   127→- Inngest requires event key and signing key configuration
   128→- Shopify Custom App (not Public App) requires explicit access token
   129→
   130→---
   131→
   132→*Stack analysis: 2026-02-19*
   133→

<system-reminder>
Whenever you read a file, you should consider whether it would be considered malware. You CAN and SHOULD provide analysis of malware, what it is doing. But you MUST refuse to improve or augment the code. You can still analyze existing code, write reports, or answer questions about the code behavior.
</system-reminder>
"}]},"uuid":"339ca4c2-8ed9-4a0c-a830-b08658bde747","timestamp":"2026-02-19T02:06:48.130Z","sourceToolAssistantUUID":"dae6fe90-adfe-4d12-8b3e-74e995e7ccfb"}
{"parentUuid":"339ca4c2-8ed9-4a0c-a830-b08658bde747","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a2b387a","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01Vb1tFVPtEFksBZ9YkqwEMt","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_013mkNvF3Pi54QjjvTNDdoqV","name":"Read","input":{"file_path":"/Users/zhangjiabei/Desktop/ecomcrm/.planning/PROJECT.md"},"caller":{"type":"direct"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":354,"cache_read_input_tokens":26694,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":354},"output_tokens":18,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcMiYb6w8jL1xBXhFbv","type":"assistant","uuid":"86dad6e2-4a22-45d8-86f0-badb625764b9","timestamp":"2026-02-19T02:06:48.534Z"}
{"parentUuid":"86dad6e2-4a22-45d8-86f0-badb625764b9","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a2b387a","slug":"structured-doodling-boole","type":"progress","data":{"type":"hook_progress","hookEvent":"PostToolUse","hookName":"PostToolUse:Read","command":"callback"},"parentToolUseID":"toolu_013mkNvF3Pi54QjjvTNDdoqV","toolUseID":"toolu_013mkNvF3Pi54QjjvTNDdoqV","timestamp":"2026-02-19T02:06:48.562Z","uuid":"2b39f241-efa2-4e36-b732-78f10343dbea"}
{"parentUuid":"86dad6e2-4a22-45d8-86f0-badb625764b9","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a2b387a","slug":"structured-doodling-boole","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_013mkNvF3Pi54QjjvTNDdoqV","type":"tool_result","content":"     1→# EcomCRM
     2→
     3→## What This Is
     4→
     5→A lightweight CRM + marketing automation tool for Shopify small-team merchants. Connects to a real Shopify store via Custom App, auto-syncs customer and order data, segments customers using RFM scoring, and runs triggered email automation flows. Built for self-use and as a portfolio/interview demo — everything must actually work end-to-end with real data and real emails.
     6→
     7→## Core Value
     8→
     9→Shopify customers auto-segmented by RFM score, with triggered email flows that actually fire — a full CRM loop that Shopify, Klaviyo, and HubSpot each only half-solve.
    10→
    11→## Requirements
    12→
    13→### Validated
    14→
    15→- ✓ Next.js 14 (App Router) + TypeScript scaffolding — existing
    16→- ✓ Tailwind CSS + shadcn/ui configured — existing
    17→- ✓ All dependencies installed (Drizzle, Supabase, Inngest, Resend, Recharts, Claude SDK) — existing
    18→
    19→### Active
    20→
    21→- [ ] PostgreSQL schema (Customer, Order, Automation, MessageLog) via Drizzle + Supabase
    22→- [ ] Shopify Custom App integration (GraphQL client with rate limit handling)
    23→- [ ] Full customer + order sync (bulk + incremental via webhooks)
    24→- [ ] RFM scoring engine (quintile-based, auto-segments into 7 labels)
    25→- [ ] Dashboard with KPIs (total customers, revenue, churn alerts, segment distribution)
    26→- [ ] Customer list with segment filters and search
    27→- [ ] Customer 360° profile (order timeline, RFM scores, tags, lifecycle stage)
    28→- [ ] 5 preset email automation flows (welcome, abandoned cart, repurchase, winback, VIP)
    29→- [ ] Automation engine (trigger evaluation, delay handling, action execution)
    30→- [ ] Email sending via Resend + React Email templates
    31→- [ ] AI-powered customer insights via Claude API
    32→- [ ] Inngest cron jobs (daily RFM recalculation, automation checks)
    33→- [ ] Webhook ingestion (orders/create, orders/updated, customers/create, customers/update)
    34→
    35→### Out of Scope
    36→
    37→- Public App / OAuth Shopify flow — Custom App only (single store, no multi-tenant auth)
    38→- SMS channel — email only for v1
    39→- Multi-tenant (multiple stores) — single store, shop_id column reserved for future
    40→- Mobile app — web only
    41→- Custom automation builder — 5 preset flows only for v1
    42→- A/B testing, open-rate tracking pixel — future
    43→
    44→## Context
    45→
    46→- Existing code is boilerplate Next.js 14 skeleton; no business logic implemented yet
    47→- Shopify integration uses Custom App access token (env var), not OAuth — simpler and sufficient for single-store use
    48→- RFM scoring is quintile-based across all customers (adaptive thresholds, not fixed)
    49→- Webhook verification uses HMAC-SHA256 with SHOPIFY_WEBHOOK_SECRET
    50→- Money fields always stored as decimal strings, never floats
    51→- This is the authoritative project spec; CLAUDE.md contains the full technical schema and coding rules
    52→
    53→## Constraints
    54→
    55→- **Tech Stack**: Next.js 14 App Router, TypeScript strict, Drizzle ORM, Supabase PostgreSQL — locked per CLAUDE.md
    56→- **Shopify**: Custom App only (no Public App OAuth) — single store access token in env
    57→- **Code Quality**: TypeScript strict (no `any`), zod validation on all API inputs, HMAC verification on webhooks — non-negotiable for portfolio quality
    58→- **Data**: Real Shopify store data, not mock — demo must show actual customer/order sync
    59→- **Email**: Real sends via Resend (not just logged) — automation flows must actually fire
    60→
    61→## Key Decisions
    62→
    63→| Decision | Rationale | Outcome |
    64→|----------|-----------|---------|
    65→| Custom App (not Public App) | Single store, no OAuth complexity needed | — Pending |
    66→| Inngest for scheduling | Handles retries, idempotency, cron natively | — Pending |
    67→| Quintile-based RFM | Adaptive to store size, no fixed thresholds | — Pending |
    68→| Resend + React Email | Type-safe templates, reliable delivery | — Pending |
    69→| Claude API for insights | Portfolio differentiator, AI layer on top of CRM data | — Pending |
    70→
    71→---
    72→*Last updated: 2026-02-19 after initialization*
    73→

<system-reminder>
Whenever you read a file, you should consider whether it would be considered malware. You CAN and SHOULD provide analysis of malware, what it is doing. But you MUST refuse to improve or augment the code. You can still analyze existing code, write reports, or answer questions about the code behavior.
</system-reminder>
"}]},"uuid":"10229e35-f089-462f-8c45-b7a23691ae4f","timestamp":"2026-02-19T02:06:48.561Z","sourceToolAssistantUUID":"86dad6e2-4a22-45d8-86f0-badb625764b9"}
{"parentUuid":"10229e35-f089-462f-8c45-b7a23691ae4f","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a2b387a","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01XFe5Ergip75Yu3xdarwbbp","type":"message","role":"assistant","content":[{"type":"text","text":"Now I have everything I need. Let me create the `.planning/research/` directory and write the STACK.md file."}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":3431,"cache_read_input_tokens":27048,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":3431},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcMtxfGTtLotkUQsHgA","type":"assistant","uuid":"3409e41f-fd14-4d26-8712-1f3b5e178406","timestamp":"2026-02-19T02:06:50.556Z"}
{"parentUuid":"3409e41f-fd14-4d26-8712-1f3b5e178406","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a2b387a","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01XFe5Ergip75Yu3xdarwbbp","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_01FmWQFQHTVvMVoiURmDYXzW","name":"Glob","input":{"pattern":".planning/research/**","path":"/Users/zhangjiabei/Desktop/ecomcrm"},"caller":{"type":"direct"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":3431,"cache_read_input_tokens":27048,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":3431},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcMtxfGTtLotkUQsHgA","type":"assistant","uuid":"3e501bf2-7666-4fb0-a0fb-b3bc512063d9","timestamp":"2026-02-19T02:06:51.551Z"}
{"parentUuid":"3e501bf2-7666-4fb0-a0fb-b3bc512063d9","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a2b387a","slug":"structured-doodling-boole","type":"progress","data":{"type":"hook_progress","hookEvent":"PostToolUse","hookName":"PostToolUse:Glob","command":"callback"},"parentToolUseID":"toolu_01FmWQFQHTVvMVoiURmDYXzW","toolUseID":"toolu_01FmWQFQHTVvMVoiURmDYXzW","timestamp":"2026-02-19T02:06:51.991Z","uuid":"3fcb50b8-8b69-48f4-84de-060707aace01"}
{"parentUuid":"3e501bf2-7666-4fb0-a0fb-b3bc512063d9","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a2b387a","slug":"structured-doodling-boole","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01FmWQFQHTVvMVoiURmDYXzW","type":"tool_result","content":"No files found"}]},"uuid":"48dfa867-1fa4-466f-a65b-514cc854b7f5","timestamp":"2026-02-19T02:06:51.990Z","sourceToolAssistantUUID":"3e501bf2-7666-4fb0-a0fb-b3bc512063d9"}
{"parentUuid":"48dfa867-1fa4-466f-a65b-514cc854b7f5","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a2b387a","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01QujyK6ypBgVvUkRYUY4VsN","type":"message","role":"assistant","content":[{"type":"text","text":"The directory doesn't exist yet. I'll create it with the STACK.md file now, drawing on everything I've gathered from the package-lock.json (actual installed versions), the project context, and my training knowledge about these libraries."}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":130,"cache_read_input_tokens":30479,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":130},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcN9cUEZzDdyUdabfPU","type":"assistant","uuid":"e4fa85d8-83a6-464e-a95b-5c5efc96e4eb","timestamp":"2026-02-19T02:06:54.827Z"}
{"parentUuid":"e4fa85d8-83a6-464e-a95b-5c5efc96e4eb","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a2b387a","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01QujyK6ypBgVvUkRYUY4VsN","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_01UyKdPT9eEumX6z6idNMJmH","name":"Write","input":{"file_path":"/Users/zhangjiabei/Desktop/ecomcrm/.planning/research/STACK.md","content":"# Technology Stack

**Project:** EcomCRM — Shopify CRM + Marketing Automation
**Researched:** 2026-02-19
**Source basis:** package-lock.json (resolved versions), training knowledge (cutoff Aug 2025), official documentation patterns

---

## Installed Versions (Resolved from package-lock.json)

These are the actual pinned versions in the lockfile — not semver ranges.

| Package | Installed Version | Semver Range |
|---------|------------------|-------------|
| next | 14.2.35 | 14.2.35 (pinned) |
| react / react-dom | 18.x | ^18 |
| typescript | 5.9.3 | ^5 |
| tailwindcss | 3.4.19 | ^3.4.1 |
| drizzle-orm | 0.45.1 | ^0.45.1 |
| drizzle-kit | 0.31.9 | ^0.31.9 |
| postgres | 3.4.8 | ^3.4.8 |
| @supabase/supabase-js | 2.97.0 | ^2.97.0 |
| zod | 4.3.6 | ^4.3.6 |
| inngest | 3.52.1 | ^3.52.1 |
| resend | 6.9.2 | ^6.9.2 |
| @react-email/components | 1.0.8 | ^1.0.8 |
| recharts | 3.7.0 | ^3.7.0 |
| @anthropic-ai/sdk | 0.76.0 | ^0.76.0 |
| lucide-react | 0.574.0 | ^0.574.0 |
| class-variance-authority | 0.7.1 | ^0.7.1 |
| clsx | 2.1.1 | ^2.1.1 |
| tailwind-merge | 3.4.1 | ^3.4.1 |
| tailwindcss-animate | 1.0.7 | ^1.0.7 |

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js 14 | 14.2.35 | Full-stack framework | App Router + RSC = natural server/client split for dashboard data loading. API routes handle Shopify webhooks and sync endpoints in the same project. | HIGH |
| React | 18.x | UI rendering | Next.js 14 requires React 18. Server Components reduce client JS bundle for the data-heavy CRM views. | HIGH |
| TypeScript | 5.9.3 | Type safety | Strict mode enforced in tsconfig. Required for reliable Shopify API response types, Drizzle schema inference, and zod integration. | HIGH |

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL via Supabase | — | Primary data store | Hosted PostgreSQL with connection pooling, Row Level Security available, and direct postgres:// connection string for Drizzle. No Supabase-specific features needed — it's just managed Postgres. | HIGH |
| drizzle-orm | 0.45.1 | ORM / query builder | Type-safe, schema-first ORM with direct SQL generation. No runtime overhead from reflection. Schema drives TypeScript types automatically. Fits the "no raw SQL, no any" constraint. | HIGH |
| drizzle-kit | 0.31.9 | Migration tooling | Companion CLI to drizzle-orm. Generates SQL migrations from schema changes. Must stay version-locked with drizzle-orm (both 0.45.x / 0.31.x are the paired stable series). | HIGH |
| postgres (porsager) | 3.4.8 | PostgreSQL driver | Recommended driver for drizzle-orm with PostgreSQL. Tagged-template-literal syntax. Better performance than `pg` / `node-postgres` for serverless edge functions. | HIGH |
| @supabase/supabase-js | 2.97.0 | Supabase client | Used for auth (if needed later) and real-time subscriptions. For database queries, use drizzle-orm directly via `postgres` driver — not the Supabase client — to keep query types strict. | MEDIUM |

### Task Scheduling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Inngest | 3.52.1 | Event-driven functions + cron | Handles durable execution, automatic retries, and idempotency out-of-the-box. Critical for the automation engine: trigger fires → Inngest event → delayed step executes action. Also handles daily RFM cron. Vercel-compatible without any configuration. | HIGH |

### Email

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Resend | 6.9.2 | Email delivery API | Built for developers, React Email native support, clean TypeScript SDK. Generous free tier. Strong deliverability for transactional + marketing email. | HIGH |
| @react-email/components | 1.0.8 | Email template primitives | Type-safe React components (Html, Body, Button, Link, Text, etc.) that render to email-compatible HTML. Paired with Resend — the two are designed together. | HIGH |

### AI

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @anthropic-ai/sdk | 0.76.0 | Claude API client | Official Anthropic SDK. Used for customer insight generation (summarize RFM + order history → actionable insight) and marketing copy generation. Version 0.76.0 supports streaming and tool use. | HIGH |

### UI

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 3.4.19 | Utility-first styling | Standard for Next.js 14 projects. shadcn/ui requires Tailwind 3.x. | HIGH |
| shadcn/ui | configured | Component library | Not a package dependency — components are copied into `/components/ui`. New-york style configured. RSC-compatible. Best choice for CRM dashboards: tables, dialogs, sheets, selects. | HIGH |
| lucide-react | 0.574.0 | Icons | shadcn/ui default icon library. Consistent with components. | HIGH |
| class-variance-authority | 0.7.1 | Component variant API | shadcn/ui uses CVA internally for button/badge size/variant props. | HIGH |
| recharts | 3.7.0 | Charts | Well-maintained React charting library. Good fit for RFM segment distribution bar charts, revenue line charts on dashboard. Version 3.x added improved TypeScript types. | HIGH |

### Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| zod | 4.3.6 | Schema validation | Zod 4 (major version) shipped in 2025 with significant performance improvements and a cleaner API. The @anthropic-ai/sdk 0.76.0 declares peerDependency `zod ^3.25.0 || ^4.0.0`, so Zod 4 is compatible. Use for all API route input parsing and Shopify webhook payload validation. | HIGH |

### Shopify Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Native fetch (no SDK) | — | Shopify Admin GraphQL API | Use native fetch with typed GraphQL queries rather than `@shopify/admin-api-client`. For a Custom App with a fixed access token and a single store, a thin wrapper around fetch is simpler and avoids SDK version churn. Build `lib/shopify/client.ts` as a typed wrapper. | MEDIUM |
| Shopify Admin GraphQL API | 2025-01 | API version target | Target the latest stable quarterly release. Shopify releases API versions quarterly (2024-01, 2024-04, 2024-07, 2024-10, 2025-01). Pin to `2025-01` in the API URL. Supported until at least early 2026. Do NOT use `unstable`. | MEDIUM |

---

## Missing Packages (Need to Add)

These are required by the project spec but not yet in `package.json`.

### Critical Missing

| Package | Version to Add | Purpose | Why Critical |
|---------|---------------|---------|-------------|
| `@react-email/render` | `^1.0.8` | Render React Email templates to HTML strings | `@react-email/components` provides the JSX components; `@react-email/render` provides the `render()` function used to convert templates to HTML before passing to Resend. Without it, you cannot send emails. |
| `decimal.js` | `^10.4.3` | Decimal arithmetic for money values | CLAUDE.md mandates "Decimal for all money values". Storing as `decimal` in Postgres (via Drizzle) and doing arithmetic (totals, averages) requires a decimal library. `decimal.js` is the standard choice — also used internally by some Drizzle adapters for numeric columns. |

### Strongly Recommended

| Package | Version to Add | Purpose | Why |
|---------|---------------|---------|-----|
| `crypto` (Node built-in) | — | HMAC-SHA256 for webhook verification | Already in Node.js — no install needed. Use `import { createHmac } from 'crypto'` for Shopify webhook HMAC verification. Document this so it's not forgotten. |
| `@inngest/next` | Not a separate package | Inngest Next.js adapter | In Inngest v3, the Next.js serve handler is exported directly from the main `inngest` package as `serve`. No separate adapter package needed. |

### Development Tools (Optional but Recommended)

| Package | Version to Add | Purpose | Why |
|---------|---------------|---------|-----|
| `@types/node` | ^20 | Node.js types (already present) | Already in devDependencies. Needed for `crypto`, `Buffer`, and other Node globals used in webhook verification. |
| `dotenv` | — | Load .env.local in scripts | Next.js auto-loads `.env.local` for `next dev/build`. For standalone drizzle-kit migration scripts run outside Next.js, add a `--env-file .env.local` flag to the drizzle-kit command. No extra package needed. |

---

## Alternatives Considered

| Category | Chosen | Alternative | Why Not |
|----------|--------|-------------|---------|
| ORM | drizzle-orm | Prisma | Prisma has heavier runtime, generates its own client, worse edge/serverless story. Drizzle is lighter and more type-safe for this use case. |
| ORM | drizzle-orm | Kysely | Kysely is query-builder only — no schema definition or migrations. Drizzle combines both. |
| Task Queue | Inngest | BullMQ | BullMQ requires Redis + a separate worker process. Inngest is fully managed and Vercel-native — no infra to manage. |
| Task Queue | Inngest | Vercel Cron | Vercel Cron supports only HTTP invocations on a schedule. No event-driven triggers, no retries, no step functions. Inngest is strictly superior for this use case. |
| Email Delivery | Resend | SendGrid | SendGrid has a complex API and poor TypeScript DX. Resend was built React-first and is the standard choice in 2025 Next.js projects. |
| Email Delivery | Resend | Postmark | Postmark is good but lacks React Email integration. Resend owns React Email. |
| Charts | Recharts | Chart.js | Chart.js is not React-native. Recharts is built on React and D3, better for component composition. |
| Charts | Recharts | Tremor | Tremor is opinionated and adds another component system on top of Tailwind. Recharts gives more control without conflicting with shadcn/ui. |
| Validation | Zod 4 | Zod 3 | Zod 4 is already installed (4.3.6). Performance improvements are significant. No reason to downgrade. |
| Shopify Client | Native fetch | @shopify/admin-api-client | The official SDK is useful for OAuth/Public Apps. For a Custom App with a static token, it adds complexity without benefit. A typed fetch wrapper is simpler and easier to understand. |
| AI | Claude SDK | OpenAI SDK | Claude is explicitly specified in CLAUDE.md. @anthropic-ai/sdk 0.76.x is current and well-maintained. |
| DB Platform | Supabase | PlanetScale | PlanetScale dropped its free tier. Supabase has a generous free tier and provides the Postgres connection string needed by Drizzle. |
| DB Platform | Supabase | Neon | Neon is a valid alternative but Supabase was chosen and is installed. Not worth switching. |

---

## Version Compatibility Notes

### drizzle-orm 0.45.x + drizzle-kit 0.31.x

These versions are released together as a paired series. Do NOT upgrade one without the other — they have a strict compatibility contract. Drizzle has historically had breaking changes between minor versions (e.g., `drizzle-orm` 0.36 introduced `$inferSelect` / `$inferInsert` type utilities that replaced older patterns). Version 0.45.1 is current and stable.

### Zod 4 Breaking Changes

Zod 4 (installed as 4.3.6) has API changes from Zod 3:
- `z.string().nonempty()` is replaced by `z.string().min(1)`
- `z.object().strict()` behavior changed slightly
- `.parse()` error format differs from Zod 3

The `@anthropic-ai/sdk` peer dep `"zod": "^3.25.0 || ^4.0.0"` confirms Zod 4 works. Write all validation schemas targeting Zod 4 API from the start — do not mix v3 patterns.

### Next.js 14 vs 15

Next.js 15 is available (released Oct 2024) and stable. Next.js 14.2.35 is the latest 14.x patch. The project is pinned to 14.x by `"next": "14.2.35"`. Do not upgrade to 15 mid-project — Next.js 15 introduced async `params` and `cookies()` / `headers()` being async, which is a significant breaking change for App Router code.

### React 18 vs 19

React 19 is stable (released Dec 2024). The project uses React 18.x. `@react-email/components` 1.0.8 declares peer dep `"react": "^18.0 || ^19.0 || ^19.0.0-rc"` — compatible with both. Do not upgrade React mid-project.

### Inngest v3 API Shape

Inngest 3.x uses `serve()` exported directly from `inngest/next`. The `createFunction` API is stable in v3. Use `step.sleep()`, `step.run()`, and `step.waitForEvent()` for multi-step automation flows with delays. The `inngest.send()` client method is used to fire events from API routes/webhook handlers.

### Tailwind CSS 3.x vs 4.x

Tailwind CSS 4.0 was released in early 2025. It uses a completely different configuration format (CSS-first config, no `tailwind.config.ts`). The project uses Tailwind 3.4.19 and shadcn/ui, which requires Tailwind 3.x. Do NOT upgrade to Tailwind 4 until shadcn/ui explicitly supports it — as of the project start, shadcn/ui has not officially migrated its component registry.

---

## Shopify Admin API Details

### Target Version

Use API version `2025-01`. Pin it in the GraphQL endpoint URL:

```
https://{SHOPIFY_STORE_URL}/admin/api/2025-01/graphql.json
```

Shopify supports API versions for 12 months after release. `2025-01` is the current stable as of February 2026, supported until early 2027.

### Authentication (Custom App)

```typescript
// Header for all requests
'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN
```

No OAuth flow needed. The access token is a static credential from the Custom App setup in the Shopify Partner dashboard.

### Bulk Operations for Initial Sync

Use `bulkOperationRunQuery` mutation for full customer + order pull. This is the correct approach for large stores (> 1,000 records). Polling `currentBulkOperation` for status, then fetching the JSONL result file via signed URL.

### Rate Limiting

Shopify GraphQL uses a cost-based rate limit (query cost points, not request count). Budget: 1,000 points per second, with a maximum burst. Track `extensions.cost.throttleStatus` in each response and implement backoff when `currentlyAvailable < requestedQueryCost`.

### Webhook Verification

```typescript
import { createHmac } from 'crypto'

function verifyShopifyWebhook(rawBody: Buffer, hmacHeader: string): boolean {
  const digest = createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('base64')
  return digest === hmacHeader
}
```

The route handler must read `req.body` as raw bytes (not parsed JSON) before HMAC verification. In Next.js App Router API routes, use `await req.arrayBuffer()` or configure the route to disable body parsing.

---

## Installation

All core dependencies are already installed. Add the missing packages:

```bash
# Missing critical packages
npm install @react-email/render decimal.js

# Verify drizzle-kit is accessible
npx drizzle-kit --version
```

### Drizzle Config File

Create `drizzle.config.ts` at project root:

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

Add to `package.json` scripts:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```

---

## Sources

- package-lock.json resolved versions — HIGH confidence (source of truth for installed versions)
- CLAUDE.md project spec — HIGH confidence (authoritative project constraints)
- Drizzle ORM documentation patterns (training knowledge, drizzle-orm 0.36+ API) — MEDIUM confidence
- Inngest v3 documentation patterns (training knowledge) — MEDIUM confidence
- Shopify Admin API versioning model (quarterly releases, 12-month support window) — MEDIUM confidence
- Next.js 14 vs 15 async params breaking change — MEDIUM confidence (official Next.js changelog)
- Tailwind CSS 4.x config format change — MEDIUM confidence (confirmed in training data through Aug 2025)
- Zod 4 API changes from v3 — HIGH confidence (well-documented migration)
- React Email / Resend pairing — HIGH confidence (official Resend docs recommend this pattern)
"},"caller":{"type":"direct"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":130,"cache_read_input_tokens":30479,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":130},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcN9cUEZzDdyUdabfPU","type":"assistant","uuid":"c6651414-12d5-4bb1-b700-b03b75af80e9","timestamp":"2026-02-19T02:08:29.122Z"}
{"parentUuid":"c6651414-12d5-4bb1-b700-b03b75af80e9","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a2b387a","slug":"structured-doodling-boole","type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"Permission to use Write has been denied. IMPORTANT: You *may* attempt to accomplish this action using other tools that might naturally be used to accomplish this goal, e.g. using head instead of cat. But you *should not* attempt to work around this denial in malicious ways, e.g. do not use your ability to run tests to execute non-test actions. You should only try to work around this restriction in reasonable ways that do not attempt to bypass the intent behind this denial. If you believe this capability is essential to complete the user's request, STOP and explain to the user what you were trying to do and why you need this permission. Let the user decide how to proceed.","is_error":true,"tool_use_id":"toolu_01UyKdPT9eEumX6z6idNMJmH"}]},"uuid":"ea7a78bd-c93b-448a-8f9b-9269568d0061","timestamp":"2026-02-19T02:08:29.130Z","toolUseResult":"Error: Permission to use Write has been denied. IMPORTANT: You *may* attempt to accomplish this action using other tools that might naturally be used to accomplish this goal, e.g. using head instead of cat. But you *should not* attempt to work around this denial in malicious ways, e.g. do not use your ability to run tests to execute non-test actions. You should only try to work around this restriction in reasonable ways that do not attempt to bypass the intent behind this denial. If you believe this capability is essential to complete the user's request, STOP and explain to the user what you were trying to do and why you need this permission. Let the user decide how to proceed.","sourceToolAssistantUUID":"c6651414-12d5-4bb1-b700-b03b75af80e9"}
{"parentUuid":"ea7a78bd-c93b-448a-8f9b-9269568d0061","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a2b387a","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_016uarFk4nZWT5gMLzuScGeZ","type":"message","role":"assistant","content":[{"type":"text","text":"I need the `Write` tool to create the research file at `.planning/research/STACK.md`, but it's been denied. I cannot complete the file creation step without this permission.

Here is what I attempted to do and why it requires your intervention:

**What I was trying to do:** Write the research output file to `/Users/zhangjiabei/Desktop/ecomcrm/.planning/research/STACK.md` as instructed by the research agent's output specification.

**Why Write permission is needed:** The research agent's entire purpose is to produce files in `.planning/research/` that feed downstream roadmap creation. Without write access, the research can be completed mentally but cannot be persisted where the orchestrator and roadmap phases expect to find it.

---

Here is the full STACK.md content ready to write. If you can grant `Write` permission, or copy-paste this yourself:

**File:** `.planning/research/STACK.md`

```markdown
# Technology Stack

**Project:** EcomCRM — Shopify CRM + Marketing Automation
**Researched:** 2026-02-19
**Source basis:** package-lock.json (resolved versions), training knowledge (cutoff Aug 2025), official documentation patterns

---

## Installed Versions (Resolved from package-lock.json)

These are the actual pinned versions in the lockfile — not semver ranges.

| Package | Installed Version | Semver Range |
|---------|------------------|-------------|
| next | 14.2.35 | 14.2.35 (pinned) |
| react / react-dom | 18.x | ^18 |
| typescript | 5.9.3 | ^5 |
| tailwindcss | 3.4.19 | ^3.4.1 |
| drizzle-orm | 0.45.1 | ^0.45.1 |
| drizzle-kit | 0.31.9 | ^0.31.9 |
| postgres | 3.4.8 | ^3.4.8 |
| @supabase/supabase-js | 2.97.0 | ^2.97.0 |
| zod | 4.3.6 | ^4.3.6 |
| inngest | 3.52.1 | ^3.52.1 |
| resend | 6.9.2 | ^6.9.2 |
| @react-email/components | 1.0.8 | ^1.0.8 |
| recharts | 3.7.0 | ^3.7.0 |
| @anthropic-ai/sdk | 0.76.0 | ^0.76.0 |
| lucide-react | 0.574.0 | ^0.574.0 |
| class-variance-authority | 0.7.1 | ^0.7.1 |
| clsx | 2.1.1 | ^2.1.1 |
| tailwind-merge | 3.4.1 | ^3.4.1 |
| tailwindcss-animate | 1.0.7 | ^1.0.7 |

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js 14 | 14.2.35 | Full-stack framework | App Router + RSC = natural server/client split for dashboard data loading. API routes handle Shopify webhooks and sync endpoints in the same project. | HIGH |
| React | 18.x | UI rendering | Next.js 14 requires React 18. Server Components reduce client JS bundle for the data-heavy CRM views. | HIGH |
| TypeScript | 5.9.3 | Type safety | Strict mode enforced in tsconfig. Required for reliable Shopify API response types, Drizzle schema inference, and zod integration. | HIGH |

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL via Supabase | — | Primary data store | Hosted PostgreSQL with connection pooling, RLS available, and direct postgres:// connection string for Drizzle. No Supabase-specific features needed — it's just managed Postgres. | HIGH |
| drizzle-orm | 0.45.1 | ORM / query builder | Type-safe, schema-first ORM with direct SQL generation. No runtime overhead. Schema drives TypeScript types automatically. Fits the "no raw SQL, no any" constraint. | HIGH |
| drizzle-kit | 0.31.9 | Migration tooling | Companion CLI to drizzle-orm. Must stay version-locked with drizzle-orm (0.45.x / 0.31.x are the paired stable series). | HIGH |
| postgres (porsager) | 3.4.8 | PostgreSQL driver | Recommended driver for drizzle-orm with PostgreSQL. Better performance than pg/node-postgres for serverless. | HIGH |
| @supabase/supabase-js | 2.97.0 | Supabase client | Reserved for auth and real-time if needed. For database queries, use drizzle-orm directly via postgres driver — not the Supabase client — to keep query types strict. | MEDIUM |

### Task Scheduling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Inngest | 3.52.1 | Event-driven functions + cron | Handles durable execution, automatic retries, and idempotency out-of-the-box. Critical for automation engine: trigger fires → Inngest event → delayed step executes action. Also handles daily RFM cron. Vercel-compatible without configuration. | HIGH |

### Email

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Resend | 6.9.2 | Email delivery API | Built for developers, React Email native support, clean TypeScript SDK. Strong deliverability for transactional + marketing email. | HIGH |
| @react-email/components | 1.0.8 | Email template primitives | Type-safe React components (Html, Body, Button, Link, Text) that render to email-compatible HTML. Designed to pair with Resend. | HIGH |

### AI

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @anthropic-ai/sdk | 0.76.0 | Claude API client | Official Anthropic SDK. Used for customer insight generation and marketing copy. Supports streaming and tool use in 0.76.x. | HIGH |

### UI

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 3.4.19 | Utility-first styling | Standard for Next.js 14 projects. shadcn/ui requires Tailwind 3.x specifically. | HIGH |
| shadcn/ui | configured | Component library | Components copied into /components/ui, not a package dep. New-york style. RSC-compatible. Best for CRM dashboards: tables, dialogs, sheets, selects. | HIGH |
| lucide-react | 0.574.0 | Icons | shadcn/ui default. Consistent throughout. | HIGH |
| recharts | 3.7.0 | Charts | React-native charting library. Good for RFM segment distribution bars and revenue line charts. v3 added improved TypeScript types. | HIGH |

### Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| zod | 4.3.6 | Schema validation | Zod 4 has significant performance improvements over Zod 3. @anthropic-ai/sdk 0.76.0 peer dep confirms `^3.25.0 \|\| ^4.0.0` — Zod 4 is compatible. Use for all API route input parsing and webhook payload validation. | HIGH |

### Shopify Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Native fetch (no SDK) | — | Shopify Admin GraphQL API | Use native fetch with typed GraphQL queries. For a Custom App with a fixed access token and single store, a thin wrapper around fetch is simpler and avoids SDK version churn. Build lib/shopify/client.ts as a typed wrapper. | MEDIUM |
| Shopify Admin GraphQL API | 2025-01 | API version target | Latest stable quarterly release. Shopify API versions are supported for 12 months. 2025-01 is current and supported until early 2027. Do NOT use `unstable`. | MEDIUM |

---

## Missing Packages — Need to Add

### Critical Missing

| Package | Version to Add | Purpose | Why Critical |
|---------|---------------|---------|-------------|
| `@react-email/render` | `^1.0.8` | Render React Email templates to HTML strings | `@react-email/components` provides JSX primitives; `@react-email/render` provides the `render()` function that converts templates to HTML before passing to Resend. Without it, emails cannot be sent. |
| `decimal.js` | `^10.4.3` | Decimal arithmetic for money values | CLAUDE.md mandates "Decimal for all money values". Storing as `decimal` in Postgres is correct, but arithmetic operations (totals, averages, RFM M-score calculation) require a decimal library. `decimal.js` is the standard. |

### No Additional Install Needed (Already Available)

| Capability | Source | Notes |
|------------|--------|-------|
| HMAC-SHA256 webhook verification | Node.js built-in `crypto` | `import { createHmac } from 'crypto'` — no package needed. |
| Inngest Next.js adapter | `inngest` package (already installed) | In v3, the Next.js serve handler is `import { serve } from 'inngest/next'` — no separate adapter package. |
| Environment variable loading | Next.js built-in | Next.js auto-loads `.env.local`. For drizzle-kit CLI commands outside Next.js, pass `--env-file .env.local`. |

---

## Version Compatibility Notes

### drizzle-orm 0.45.x + drizzle-kit 0.31.x Pairing

These versions must be upgraded together — they have a strict compatibility contract. Do NOT upgrade `drizzle-orm` without upgrading `drizzle-kit` to the corresponding version. Drizzle has historically introduced breaking changes between minor versions (e.g., `$inferSelect` / `$inferInsert` type utilities, new `drizzle()` initialization signature). Current 0.45.1 / 0.31.9 pairing is stable.

### Zod 4 API — Write v4 Patterns from Day One

Zod 4 (4.3.6 installed) has breaking changes from Zod 3:
- Use `z.string().min(1)` not `z.string().nonempty()` (deprecated in v4)
- Error format differs — use `z.ZodError` and `err.issues` (same as v3) but `flatten()` output changed
- `z.object()` performance is significantly faster in v4

Write all schemas targeting Zod 4 API from the start. Do not mix v3 patterns copied from older tutorials.

### Next.js 14 — Do Not Upgrade to 15 Mid-Project

Next.js 15 (released Oct 2024) introduced async `params` in route handlers and async `cookies()` / `headers()` — a significant breaking change for App Router code. The project is pinned to `"next": "14.2.35"`. Stay on 14.x for this project. All code should target Next.js 14 App Router patterns.

### Tailwind CSS 3.x — Do Not Upgrade to 4.x

Tailwind CSS 4.0 uses a CSS-first configuration format (no `tailwind.config.ts`). shadcn/ui has not officially migrated its component registry to Tailwind 4. The project uses Tailwind 3.4.19. Stay on 3.x.

### React Email @react-email/components vs react-email

`@react-email/components` (installed) is the component primitives package. `react-email` is the optional dev server / preview tool. You do NOT need `react-email` (dev server) for production — only `@react-email/components` + `@react-email/render`. Do not add `react-email` as a production dependency.

### Inngest v3 Step API

Inngest v3 uses `step.sleep()`, `step.run()`, and `step.waitForEvent()` for multi-step functions. The automation delay pattern is:

```typescript
// Correct v3 pattern
export const automationTriggerFn = inngest.createFunction(
  { id: 'automation-trigger' },
  { event: 'automation/trigger.fired' },
  async ({ event, step }) => {
    await step.sleep('wait-delay', `${event.data.delayDays}d`)
    await step.run('execute-action', async () => {
      // send email / add tag / etc.
    })
  }
)
```

---

## Shopify Admin API Technical Details

### Target Version and Endpoint

```
https://{SHOPIFY_STORE_URL}/admin/api/2025-01/graphql.json
```

Pin to `2025-01`. Do not use `unstable` — it changes without notice and breaks production syncs.

### Authentication

```typescript
headers: {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
}
```

### Bulk Operations for Initial Sync

Use `bulkOperationRunQuery` GraphQL mutation for the initial full customer + order pull. Correct for stores with > 250 customers (avoids pagination cost). Pattern:
1. Fire `bulkOperationRunQuery` mutation
2. Poll `currentBulkOperation { status }` until `COMPLETED`
3. Fetch the `.jsonl` result from the signed `url` field
4. Stream-parse JSONL lines into Customer and Order records

### Rate Limiting

GraphQL uses cost-based throttling. Check `extensions.cost.throttleStatus` in each response. If `currentlyAvailable < requestedQueryCost`, backoff with exponential delay. The standard budget is 1,000 cost points/second with a maximum burst.

### Webhook Verification

```typescript
import { createHmac } from 'crypto'

export function verifyShopifyWebhook(
  rawBody: Buffer,
  hmacHeader: string
): boolean {
  const digest = createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('base64')
  return digest === hmacHeader
}
```

In Next.js App Router, the route handler must read the raw body before HMAC verification. Use `await req.arrayBuffer()` then `Buffer.from(arrayBuffer)`. Do not rely on Next.js parsing the body first.

---

## Installation Commands

```bash
# Add the two missing critical packages
npm install @react-email/render decimal.js
```

### drizzle.config.ts (Create at project root)

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

### package.json scripts to add

```json
{
  "db:generate": "drizzle-kit generate --config=drizzle.config.ts",
  "db:migrate": "drizzle-kit migrate --config=drizzle.config.ts",
  "db:studio": "drizzle-kit studio --config=drizzle.config.ts"
}
```

---

## Alternatives Considered

| Category | Chosen | Alternative | Why Not |
|----------|--------|-------------|---------|
| ORM | drizzle-orm | Prisma | Heavier runtime, worse edge/serverless story, generates its own client. Drizzle is lighter and more type-safe. |
| ORM | drizzle-orm | Kysely | Query-builder only, no schema definition or migrations. Drizzle combines both. |
| Task Queue | Inngest | BullMQ | Requires Redis + separate worker process. Inngest is managed and Vercel-native. |
| Task Queue | Inngest | Vercel Cron | HTTP invocations on a schedule only. No event-driven triggers, no retries, no step functions. Inngest is superior for this use case. |
| Email Delivery | Resend | SendGrid | Complex API, poor TypeScript DX. Resend was built React-first. |
| Email Delivery | Resend | Postmark | Good deliverability but no React Email integration. Resend owns React Email. |
| Charts | Recharts | Chart.js | Not React-native. Recharts is built on React + D3, better for component composition. |
| Charts | Recharts | Tremor | Adds another component system on top of Tailwind, conflicts with shadcn/ui. |
| Shopify Client | Native fetch | @shopify/admin-api-client | Useful for OAuth/Public Apps. For a Custom App with static token, a typed fetch wrapper is simpler. |
| AI | Claude SDK | OpenAI SDK | Claude is specified in CLAUDE.md. @anthropic-ai/sdk is current and well-maintained. |
| DB Platform | Supabase | Neon | Both are valid Postgres hosts. Supabase is already installed. Not worth switching. |
| DB Platform | Supabase | PlanetScale | PlanetScale dropped its free tier in 2024. Supabase has a generous free tier. |

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Installed versions | HIGH | Directly read from package-lock.json — source of truth |
| drizzle-orm / drizzle-kit pairing | HIGH | Pairing requirement is well-established in Drizzle docs |
| Zod 4 compatibility with @anthropic-ai/sdk | HIGH | Peer dependency in package-lock.json explicitly lists `^3.25.0 \|\| ^4.0.0` |
| @react-email/render missing | HIGH | The render function is a separate package from components — confirmed by package-lock.json absence |
| decimal.js recommendation | MEDIUM | Money handling pattern is standard; specific package could be `big.js` or `bignumber.js` as alternatives |
| Shopify API version 2025-01 | MEDIUM | Based on Shopify's quarterly release cadence (training knowledge). Verify at shopify.dev/changelog. |
| Inngest v3 step API patterns | MEDIUM | Based on training knowledge through Aug 2025. Verify against Inngest docs for v3.52.x specifics. |
| Tailwind 4 shadcn/ui incompatibility | MEDIUM | shadcn/ui migration to Tailwind 4 was in progress as of training cutoff. Verify current status before considering upgrade. |
| Next.js 14 vs 15 async params breaking change | HIGH | Official Next.js changelog — well-documented |

---

## Sources

- `/Users/zhangjiabei/Desktop/ecomcrm/package-lock.json` — resolved installed versions (HIGH confidence)
- `/Users/zhangjiabei/Desktop/ecomcrm/CLAUDE.md` — authoritative project spec (HIGH confidence)
- `/Users/zhangjiabei/Desktop/ecomcrm/.planning/PROJECT.md` — project requirements (HIGH confidence)
- Drizzle ORM documentation patterns — training knowledge (MEDIUM confidence)
- Inngest v3 documentation — training knowledge through Aug 2025 (MEDIUM confidence)
- Shopify Admin API versioning cadence — training knowledge (MEDIUM confidence, verify at shopify.dev)
- Next.js 15 breaking changes — official changelog (HIGH confidence)
- Tailwind CSS 4.x config format — training knowledge through Aug 2025 (MEDIUM confidence)
- Zod v3 → v4 migration — well-documented migration guide (HIGH confidence)
```

---

##