# Technology Stack

**Analysis Date:** 2026-02-19

## Languages

**Primary:**
- TypeScript 5.x - Strict mode across entire codebase
- JavaScript (JSX/TSX) - React and Next.js components

**Secondary:**
- CSS (Tailwind directives) - Styling via Tailwind CSS
- MDX/Markdown - Configuration files (postcss.config.mjs, next.config.mjs)

## Runtime

**Environment:**
- Node.js (compatible with Next.js 14.2.35, tested with npm)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 14.2.35 - App Router (required: TypeScript strict, no older Pages Router)
- React 18.x - Server and Client Components

**UI & Styling:**
- Tailwind CSS 3.4.1 - Utility-first CSS framework
- tailwindcss-animate 1.0.7 - Animation utilities
- tailwind-merge 3.4.1 - Utility class deduplication
- shadcn/ui - Component library (configured in `components.json`, uses lucide icons)
- lucide-react 0.574.0 - Icon library

**Component Utilities:**
- class-variance-authority 0.7.1 - Component variant system
- clsx 2.1.1 - Conditional className builder

**Testing:**
- Not detected in dependencies

**Build/Dev:**
- TypeScript 5.x - Type checking
- drizzle-kit 0.31.9 - ORM migrations and schema generation
- PostCSS 8.x - CSS preprocessing (Tailwind)

## Key Dependencies

**Critical:**
- drizzle-orm 0.45.1 - Type-safe ORM for database queries (PostgreSQL via Supabase)
- postgres 3.4.8 - PostgreSQL client for connection pooling and driver
- zod 4.3.6 - Runtime schema validation for API inputs
- @supabase/supabase-js 2.97.0 - Supabase client for database access

**Task Scheduling & Serverless:**
- inngest 3.52.1 - Event-driven task scheduling (cron jobs, automation engine)

**Email & Notifications:**
- resend 6.9.2 - Email delivery service
- @react-email/components 1.0.8 - React-based email template components

**Charts & Visualization:**
- recharts 3.7.0 - React charting library for RFM analytics and customer insights

**AI & LLM:**
- @anthropic-ai/sdk 0.76.0 - Anthropic Claude API for customer insights and copy generation

**UI Utilities:**
- lucide-react 0.574.0 - SVG icon library (consistent with shadcn/ui)

## Configuration

**Environment:**
- Environment variables stored in `.env.local` (not committed to git)
- Verified env vars required:
  - `SHOPIFY_STORE_URL` - Shopify store domain
  - `SHOPIFY_CLIENT_ID` - Partners Dashboard OAuth client ID
  - `SHOPIFY_CLIENT_SECRET` - Partners Dashboard OAuth client secret (also used as webhook secret)
  - `SHOPIFY_WEBHOOK_SECRET` - HMAC secret for webhook verification
  - `DATABASE_URL` - PostgreSQL connection string
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
  - `RESEND_API_KEY` - Resend email service API key
  - `ANTHROPIC_API_KEY` - Claude API key
  - `INNGEST_EVENT_KEY` - Inngest event signing key
  - `INNGEST_SIGNING_KEY` - Inngest webhook signing key

**Build:**
- `next.config.mjs` - Next.js build configuration (default/minimal)
- `tsconfig.json` - TypeScript compiler with:
  - `"strict": true` - Strict type checking
  - `"noEmit": true` - Type checking only, no emit
  - `"moduleResolution": "bundler"` - Modern module resolution
  - Path alias: `@/*` → `./src/*`
- `postcss.config.mjs` - PostCSS with Tailwind CSS plugin
- `tailwind.config.ts` - Tailwind configuration with:
  - dark mode via class toggle
  - shadcn/ui color system (HSL variables)
  - Extended theme colors for charts
  - tailwindcss-animate plugin

**Component Configuration:**
- `components.json` - shadcn/ui configuration:
  - Style: "new-york"
  - RSC (React Server Components): enabled
  - Icon library: lucide
  - Base color: neutral
  - CSS variables: enabled
  - Aliases configured for components, utils, ui, lib, hooks

## Platform Requirements

**Development:**
- Node.js 18+ (compatible with Next.js 14)
- npm 8+ or equivalent
- Terminal access for git and build tools

**Production:**
- Deployment target: Vercel (primary)
- Alternative: Any Node.js 18+ hosting supporting Next.js 14 SSR + API routes
- Database: PostgreSQL 13+ (via Supabase)
- Secrets: `.env.local` file with all credentials before deployment

**Runtime Constraints:**
- Money fields must use Decimal types (not float) per CLAUDE.md
- Inngest requires event key and signing key configuration
- Shopify OAuth app (Partners Dashboard) uses SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET via client credentials grant — no static access token

---

*Stack analysis: 2026-02-19*
