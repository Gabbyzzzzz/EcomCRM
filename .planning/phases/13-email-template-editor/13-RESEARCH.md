# Phase 13: Email Template Editor - Research

**Researched:** 2026-02-22
**Domain:** Unlayer drag-and-drop email editor, Supabase Storage, Drizzle schema migration
**Confidence:** HIGH (core APIs verified via official docs and GitHub source)

---

## Summary

Phase 13 adds a visual email template editor using Unlayer (`react-email-editor` v1.7.11). The existing `/emails` page shows a static list of 5 hardcoded React Email templates — this phase replaces it with a database-backed system where templates are stored as Unlayer design JSON + rendered HTML in a new `email_templates` table. Merchants can create, duplicate, delete, and edit templates in a full drag-and-drop editor. Images uploaded in the editor are stored in Supabase Storage and served as public URLs.

The primary integration challenge is that `react-email-editor` is a browser-only component (it renders an iframe) — it MUST be a Client Component loaded with `next/dynamic` and `ssr: false`. The `onReady` callback (not `onLoad`) is the correct place to call `loadDesign()`. The `exportHtml()` callback returns both `design` (JSON, for re-editing) and `html` (string, for sending). Both must be saved.

The image upload path uses Unlayer's `registerCallback('image', fn)` — the callback receives `file.attachments[0]` and must call `done({ progress: 100, url })` with the uploaded URL. This routes to a Next.js API route that uploads to Supabase Storage using the service role key and returns a public URL.

**Primary recommendation:** Use `react-email-editor` 1.7.11 with `next/dynamic` + `ssr:false`. Store design JSON in `jsonb` column. Seed the 5 preset templates via a one-time script using `onConflictDoNothing`. The existing `automations.emailTemplateId` column (currently `varchar`) should be updated to `uuid` FK pointing to the new table.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-email-editor | 1.7.11 | Unlayer drag-and-drop editor wrapper | Official Unlayer React package; MIT licensed; exports `EditorRef`, `EmailEditorProps` TypeScript types |
| @supabase/supabase-js | ^2.97.0 (already installed) | Storage upload + public URL | Already in project; service role key gives server-side upload access |
| drizzle-orm | ^0.45.1 (already installed) | email_templates table, seeding | Already in project |

### No New Dependencies Required

All dependencies for this phase are already installed:
- `react-email-editor` is the only new package
- Supabase Storage uses existing `@supabase/supabase-js`
- Schema changes use existing Drizzle + `drizzle-kit`
- UI uses existing shadcn/ui + Tailwind

**Installation:**
```bash
npm install react-email-editor
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-email-editor (Unlayer) | GrapesJS, Bee Plugin, Stripo | Unlayer is locked in by requirements; others have different APIs |
| Supabase Storage | Uploadthing, Cloudinary | Supabase already in project; no new service needed |
| `registerCallback('image')` | Unlayer S3 config via `projectId` | `projectId` requires a paid Unlayer account; callback works on free tier |

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── emails/
│   │       ├── page.tsx                   # REPLACE: template list with DB-backed cards
│   │       └── [id]/
│   │           ├── page.tsx               # REPLACE: becomes redirect to /emails/[id]/edit
│   │           └── edit/
│   │               └── page.tsx           # NEW: Unlayer editor page (Server wrapper)
│   └── api/
│       ├── email-templates/
│       │   ├── route.ts                   # GET list, POST create
│       │   └── [id]/
│       │       └── route.ts               # GET one, PUT update (save), DELETE
│       └── uploads/
│           └── image/
│               └── route.ts               # POST: multipart → Supabase Storage → return URL
├── components/
│   └── email-editor/
│       ├── UnlayerEditor.tsx              # 'use client' — dynamic import wrapper
│       └── TemplateCard.tsx               # Card component for /emails list
├── lib/
│   └── db/
│       └── schema.ts                      # ADD: emailTemplates table
└── scripts/
    └── seed-email-templates.ts            # One-time preset seeder
```

### Pattern 1: Next.js 14 Client Component with SSR Disabled

**What:** `react-email-editor` uses browser APIs (iframe DOM access). It cannot run during SSR. The editor page must be a Server Component that renders a Client Component that dynamically imports the editor.

**When to use:** Any component wrapping `react-email-editor`.

**Example:**
```typescript
// src/components/email-editor/UnlayerEditor.tsx
'use client'

import dynamic from 'next/dynamic'
import { useRef, useCallback } from 'react'
import type { EditorRef, EmailEditorProps } from 'react-email-editor'

// Dynamic import with ssr:false — MUST be at module level, not inside render
const EmailEditor = dynamic(() => import('react-email-editor'), { ssr: false })

interface UnlayerEditorProps {
  initialDesign?: object
  onSave: (html: string, design: object) => Promise<void>
}

export function UnlayerEditor({ initialDesign, onSave }: UnlayerEditorProps) {
  const editorRef = useRef<EditorRef | null>(null)

  // Use onReady (NOT onLoad) to call loadDesign — onLoad fires before editor is ready
  const onReady: EmailEditorProps['onReady'] = useCallback((unlayer) => {
    if (initialDesign) {
      unlayer.loadDesign(initialDesign as Parameters<typeof unlayer.loadDesign>[0])
    }

    // Register custom image upload callback — routes through our API
    unlayer.registerCallback('image', async (file: { attachments: File[] }, done: (result: { progress: number; url?: string }) => void) => {
      done({ progress: 0 })
      const formData = new FormData()
      formData.append('file', file.attachments[0])
      const res = await fetch('/api/uploads/image', { method: 'POST', body: formData })
      const { url } = await res.json()
      done({ progress: 100, url })
    })
  }, [initialDesign])

  const handleSave = useCallback(() => {
    editorRef.current?.editor?.exportHtml(async (data) => {
      const { html, design } = data
      await onSave(html, design)
    })
  }, [onSave])

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end p-2 border-b">
        <button onClick={handleSave}>Save Template</button>
      </div>
      <EmailEditor
        ref={editorRef}
        onReady={onReady}
        minHeight="calc(100vh - 120px)"
        options={{ version: 'latest', appearance: { theme: 'modern_light' } }}
      />
    </div>
  )
}
```

### Pattern 2: Image Upload API Route

**What:** Next.js App Router route handler that accepts multipart FormData, uploads to Supabase Storage, returns public URL.

**When to use:** Called by Unlayer's `registerCallback('image')`.

**Example:**
```typescript
// src/app/api/uploads/image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// Service role client — NEVER expose to browser
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `email-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('email-assets')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from('email-assets').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
```

### Pattern 3: Drizzle Schema — emailTemplates Table

**What:** New table for storing Unlayer templates. The `designJson` column holds the Unlayer design JSON (for re-editing). The `html` column holds the rendered output (for sending). `isPreset = true` rows are the 5 built-in templates that automations reference.

**Example:**
```typescript
// Addition to src/lib/db/schema.ts
export const emailTemplates = pgTable(
  'email_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: varchar('shop_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    html: text('html'),
    designJson: jsonb('design_json'),
    isPreset: boolean('is_preset').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('email_templates_shop_id_idx').on(table.shopId),
    index('email_templates_is_preset_idx').on(table.isPreset),
  ]
)
```

Note: The existing `automations.emailTemplateId` is currently `varchar(255)`. It stores string IDs like `'welcome'`. In Phase 13, if automations are to reference the new `email_templates` table, this column must become a UUID FK. However, changing this FK breaks existing automation wiring. The safest approach: add `email_templates` rows with stable names, keep `emailTemplateId` as varchar for now but store the UUID as the value. Alternatively, add a `templateName` lookup at runtime. **This is an open question for the planner to decide** — see Open Questions below.

### Pattern 4: Preset Template Seeding

**What:** A one-time script (or Inngest startup function) inserts the 5 preset Unlayer design JSONs using `onConflictDoNothing`. The preset JSONs are authored by hand (simple Unlayer JSON structure) and stored as constants in the codebase.

**When to use:** Run once at deploy time via `npx tsx scripts/seed-email-templates.ts`.

**Example:**
```typescript
// scripts/seed-email-templates.ts
import 'dotenv/config'
import { db } from '@/lib/db'
import { emailTemplates } from '@/lib/db/schema'
import { WELCOME_DESIGN } from '@/lib/email/presets/welcome'
// ... import other presets

const SHOP_ID = process.env.SHOPIFY_STORE_URL!.replace('https://', '').replace('.myshopify.com', '')

const PRESETS = [
  { name: 'Welcome', design: WELCOME_DESIGN },
  { name: 'Abandoned Cart', design: ABANDONED_CART_DESIGN },
  { name: 'Repurchase', design: REPURCHASE_DESIGN },
  { name: 'Win-back', design: WINBACK_DESIGN },
  { name: 'VIP', design: VIP_DESIGN },
]

for (const preset of PRESETS) {
  await db.insert(emailTemplates).values({
    shopId: SHOP_ID,
    name: preset.name,
    designJson: preset.design,
    html: '',        // populated on first editor open + save
    isPreset: true,
  }).onConflictDoNothing()
}
```

### Pattern 5: Unlayer Design JSON Format

**What:** The design JSON produced and consumed by `loadDesign` / `exportHtml`. Must be stored in `jsonb`. The top-level structure is:

```json
{
  "schemaVersion": 12,
  "counters": {
    "u_row": 3,
    "u_column": 4,
    "u_content_text": 2,
    "u_content_image": 1,
    "u_content_button": 1,
    "u_content_heading": 1,
    "u_content_divider": 1
  },
  "body": {
    "id": "unique-body-id",
    "rows": [
      {
        "id": "row-id",
        "cells": [1],
        "columns": [
          {
            "id": "col-id",
            "contents": [
              {
                "id": "content-id",
                "type": "text",
                "values": {
                  "text": "<p>Hello {{first_name}}</p>",
                  "color": "#000000",
                  "fontSize": "14px"
                }
              }
            ],
            "values": { "backgroundColor": "#ffffff", "padding": "10px" }
          }
        ],
        "values": { "backgroundColor": "", "padding": "0px" }
      }
    ],
    "values": {
      "backgroundColor": "#f0f0f0",
      "fontFamily": { "label": "Arial", "value": "arial,helvetica,sans-serif" }
    }
  }
}
```

The preset templates are simple hand-authored JSONs following this structure. They do NOT need to be converted from the existing React Email templates — they are built fresh in Unlayer's native format. The simplest preset is a 1-column layout with logo, heading, text, button, and footer rows.

### Anti-Patterns to Avoid

- **Calling `loadDesign` in `onLoad`:** `onLoad` fires before the editor iframe is fully initialized. Use `onReady` instead — it guarantees initialization is complete.
- **Dynamic import inside a component render:** `next/dynamic` call must be at module level, not inside a function or conditional. `const EmailEditor = dynamic(...)` at the top of the file.
- **Not storing both html AND design:** Storing only HTML means the template cannot be re-edited. Storing only JSON means sending requires re-export. Store both.
- **Uploading images directly from client to Supabase:** Exposing `SUPABASE_SERVICE_ROLE_KEY` to the browser is a critical security issue. Always proxy image uploads through a Next.js API route.
- **Using `Blob` type checks:** The `file.attachments[0]` from Unlayer's callback is a `File` (extends `Blob`). Supabase storage's `upload()` accepts `File` directly — no conversion needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop email layout | Custom block editor | `react-email-editor` (Unlayer) | Email rendering across 50+ clients is extremely complex; Unlayer handles this |
| Design JSON serialization | Custom template format | Unlayer's native design JSON | Already validated by Unlayer's own rendering engine |
| Image storage | Local filesystem or DB blob | Supabase Storage | Already in project; handles CDN, public URLs, RLS |
| Thumbnail generation | Puppeteer/screenshot | Colored placeholder div | Requirements explicitly say "placeholder thumbnail" — no generation needed |
| Template version history | Custom revision table | Single JSON overwrite | Not required in this phase |

**Key insight:** The Unlayer design JSON format is intentionally opaque — don't parse or modify it. Treat `designJson` as a black box: read it from DB, pass it to `loadDesign()`, get it back from `exportHtml()`, save it to DB. Never transform it.

---

## Common Pitfalls

### Pitfall 1: "window is not defined" SSR Error

**What goes wrong:** Importing `react-email-editor` at the top level of any file that runs on the server causes `ReferenceError: window is not defined`.

**Why it happens:** The Unlayer editor initializes browser globals on module load.

**How to avoid:** Always use `dynamic(() => import('react-email-editor'), { ssr: false })`. The dynamic call must be at the TOP LEVEL of the module file (not inside a function). The wrapping component file must include `'use client'`.

**Warning signs:** Build-time errors like `ReferenceError: window is not defined` in `next build` output.

### Pitfall 2: `emailEditorRef.current.editor` is null

**What goes wrong:** Calling `exportHtml()` or `loadDesign()` before the editor has initialized throws a null reference error.

**Why it happens:** The ref is set when the React component mounts, but the Unlayer iframe needs additional time to load.

**How to avoid:** Only call editor methods inside the `onReady` callback or after `onReady` has fired. Gate all `Save` button clicks with a null check: `editorRef.current?.editor?.exportHtml(...)`.

**Warning signs:** Intermittent failures on fast machines, always fails on first render.

### Pitfall 3: `registerCallback('image')` Broken in Recent Unlayer Versions

**What goes wrong:** The image upload callback silently stops working in Unlayer editor versions newer than `1.157.0`. The free tier lost this feature in late 2024.

**Why it happens:** Unlayer moved custom image storage to paid plans via a server-side change (not an npm package change). Setting `version: 'latest'` in `options` uses their latest cloud editor, which enforces the paywall.

**How to avoid:** Pin the Unlayer editor engine version by setting `options={{ version: '1.157.0' }}` in the `EmailEditor` component props. The npm package version (1.7.11) is separate from the Unlayer engine version passed in `options`. `1.157.0` is the last version where `registerCallback('image')` works on free tier.

**Warning signs:** Image upload button in editor does nothing, or shows Unlayer's own upload dialog instead of calling your callback.

### Pitfall 4: `exportHtml` Callback vs Promise API

**What goes wrong:** Trying to `await` the result of `exportHtml()` — it uses callback-based API, not Promises.

**Why it happens:** The Unlayer API predates async/await conventions.

**How to avoid:** Wrap in a Promise if needed:
```typescript
const exportHtmlAsync = () => new Promise<{ html: string; design: object }>((resolve) => {
  editorRef.current?.editor?.exportHtml((data) => resolve({ html: data.html, design: data.design }))
})
```

### Pitfall 5: Supabase Storage Bucket Must Be Public

**What goes wrong:** Uploading succeeds but `getPublicUrl()` returns a URL that returns 403 to browser clients.

**Why it happens:** Supabase buckets are private by default. `getPublicUrl()` constructs the URL but does not validate that the bucket is actually public.

**How to avoid:** Create the `email-assets` bucket via Supabase dashboard with "Public bucket" enabled. Alternatively create it via SQL: `INSERT INTO storage.buckets (id, name, public) VALUES ('email-assets', 'email-assets', true)`. No RLS policies are required on public buckets for read access.

### Pitfall 6: `automations.emailTemplateId` FK Mismatch

**What goes wrong:** The existing `automations.emailTemplateId` column is `varchar(255)` storing string names like `'welcome'`. After Phase 13, template IDs are UUIDs. Existing automation lookups by string name will break.

**Why it happens:** Phase 13 introduces a new data model; the old system used string IDs hardcoded in `sendMarketingEmail`.

**How to avoid:** The migration plan must decide: (a) keep `varchar` and use template name lookup, or (b) migrate `emailTemplateId` to `uuid FK`. See Open Questions.

### Pitfall 7: React StrictMode Double-Fire

**What goes wrong:** In development with React StrictMode, `onReady` fires twice, causing `loadDesign` to be called twice, sometimes clearing edits.

**Why it happens:** React StrictMode invokes effects twice in development.

**How to avoid:** Use a `useRef` flag to track whether design was loaded:
```typescript
const designLoadedRef = useRef(false)
const onReady = (unlayer) => {
  if (!designLoadedRef.current && initialDesign) {
    unlayer.loadDesign(initialDesign)
    designLoadedRef.current = true
  }
}
```

---

## Code Examples

Verified patterns from official sources:

### exportHtml — official Unlayer docs

```typescript
// Source: https://docs.unlayer.com/builder/load-and-save-designs
unlayer.exportHtml(function (data) {
  const json = data.design  // → store in designJson column (jsonb)
  const html = data.html    // → store in html column (text)
  // full returned shape also includes: data.chunks.body, .css, .js, .fonts
})

// With options:
unlayer.exportHtml(callback, {
  minify: true,
  inlineStyles: true,   // recommended for email client compatibility
})
```

### loadDesign — official Unlayer docs

```typescript
// Source: https://docs.unlayer.com/builder/load-and-save-designs
const design = { /* Unlayer design JSON from DB */ }
unlayer.loadDesign(design)
// Must be called inside onReady, not onLoad
```

### Image upload registerCallback — GitHub issues verified

```typescript
// Source: https://github.com/unlayer/react-email-editor/issues/337
// file.attachments[0] is a File object
unlayer.registerCallback('image', async (file, done) => {
  done({ progress: 0 })                        // signal upload started
  const formData = new FormData()
  formData.append('file', file.attachments[0])
  const res = await fetch('/api/uploads/image', { method: 'POST', body: formData })
  const { url } = await res.json()
  done({ progress: 100, url })                 // signal complete + provide URL
})
```

### Supabase Storage upload + getPublicUrl — official Supabase docs

```typescript
// Source: https://supabase.com/docs/reference/javascript/storage-from-upload
const { error } = await supabase.storage
  .from('email-assets')
  .upload(path, file, { contentType: file.type })

// Source: https://supabase.com/docs/reference/javascript/storage-from-getpublicurl
const { data } = supabase.storage.from('email-assets').getPublicUrl(path)
const publicUrl = data.publicUrl
```

### Drizzle insert with onConflictDoNothing — official Drizzle docs

```typescript
// Source: https://orm.drizzle.team/docs/insert
await db.insert(emailTemplates)
  .values({ shopId, name, isPreset: true, designJson: design })
  .onConflictDoNothing()
```

### Next.js App Router formData file upload — verified

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route
// Native Web API — no library needed for file parsing in Next.js 14+
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Unlayer image upload via `registerCallback` on any version | Must pin to `options.version: '1.157.0'` | Late 2024 | Free tier lost custom image callbacks in newer engine versions |
| `onLoad` for design loading | `onReady` for design loading | Library matures | `onLoad` is unreliable for `loadDesign()`; `onReady` guarantees readiness |
| formidable for multipart parsing in Next.js | `request.formData()` Web API | Next.js 13.4+ | No extra library needed for file uploads in App Router routes |

**Deprecated/outdated:**
- `@types/react-email-editor`: The main `react-email-editor` package ships its own TypeScript types as of 1.7.x. The separate `@types/react-email-editor` package is obsolete.
- `options.version: 'latest'`: Do not use for image upload functionality. Pin to `'1.157.0'`.

---

## Open Questions

1. **`automations.emailTemplateId` migration strategy**
   - What we know: Current column is `varchar(255)` storing string names (`'welcome'`). The `sendMarketingEmail` engine passes this string to `executeEmailAction`. The new `email_templates` table uses UUID PKs.
   - What's unclear: Should Phase 13 (a) leave `emailTemplateId` as varchar and do a name-based lookup in `email_templates`, or (b) migrate `emailTemplateId` to UUID FK now, requiring a data migration of all existing automation rows?
   - Recommendation: Option (a) is lower risk for this phase — add a `name` unique index to `email_templates` and look up by name. Option (b) is cleaner long-term but requires careful data migration. Planner should decide based on whether automation engine changes are in scope.

2. **Preset template design JSON source**
   - What we know: The 5 preset templates must be "built natively in Unlayer" (not converted from React Email). The design JSON structure is documented above.
   - What's unclear: The actual content/design of each preset (colors, copy, layout) needs to be authored. This is creative work, not just engineering.
   - Recommendation: Author minimal but functional presets (logo placeholder, heading, body text, CTA button, footer/unsubscribe row). Store as TypeScript constants in `src/lib/email/presets/`. Merchants will customize via the editor anyway.

3. **Supabase Storage bucket creation (manual vs automated)**
   - What we know: The `email-assets` bucket must exist and be public before the upload API route can work.
   - What's unclear: Whether the bucket should be created manually via dashboard or via a setup script.
   - Recommendation: Manual creation via Supabase dashboard is sufficient. Document it as a setup step in the plan verification checklist.

4. **`registerCallback('image')` reliability confirmation**
   - What we know: The callback was broken in late 2024 for newer Unlayer engine versions. Pinning to `version: '1.157.0'` in `options` is the confirmed workaround.
   - What's unclear: Whether `1.157.0` still works as of February 2026 (research date). The free tier paywall is enforced server-side by Unlayer's CDN.
   - Recommendation: The plan should include a task to verify the callback works after integration. If it does not, the fallback is to hide the image button entirely (`options.features = { imageEditor: false }`) and accept text-only templates for the free tier.

---

## Sources

### Primary (HIGH confidence)
- `react-email-editor` GitHub README — `loadDesign`, `exportHtml`, TypeScript types, `onLoad` vs `onReady`
- `react-email-editor` demo `demo/src/example/index.tsx` — official usage pattern
- `react-email-editor` demo `sample.json` (raw GitHub) — Unlayer design JSON format (schemaVersion, counters, body, rows, columns, contents)
- https://docs.unlayer.com/builder/load-and-save-designs — `loadDesign`, `exportHtml` API
- https://docs.unlayer.com/builder/export-html — `exportHtml` return structure (design, html, chunks)
- https://supabase.com/docs/reference/javascript/storage-from-upload — upload() signature
- https://supabase.com/docs/reference/javascript/storage-from-getpublicurl — getPublicUrl() usage
- https://orm.drizzle.team/docs/insert — `onConflictDoNothing` syntax
- npm show react-email-editor version → `1.7.11` (latest as of research date)

### Secondary (MEDIUM confidence)
- https://github.com/unlayer/react-email-editor/issues/337 — `registerCallback('image')` working pattern (`file.attachments[0]`, `done({ progress, url })`)
- https://github.com/unlayer/react-email-editor/issues/376 — confirmed `dynamic import + ssr:false` solves window is not defined
- https://github.com/unlayer/react-email-editor/issues/435 — `selectImage` broken in newer Unlayer engine versions; workaround: `options.version: '1.157.0'`
- https://nextjs.org/docs/app/api-reference/file-conventions/route — `request.formData()` pattern for file uploads

### Tertiary (LOW confidence)
- Multiple WebSearch results confirming `dynamic(() => import('react-email-editor'), { ssr: false })` pattern — consistent across sources
- WebSearch results on `onConflictDoNothing` for idempotent seeding — consistent with Drizzle docs

---

## Metadata

**Confidence breakdown:**
- Standard stack (react-email-editor 1.7.11): HIGH — verified via npm, GitHub, official docs
- Unlayer APIs (loadDesign, exportHtml): HIGH — verified via official Unlayer docs
- Image upload callback (`registerCallback('image')`): MEDIUM — confirmed working pattern from GitHub issues; free-tier status in 2026 is unverified
- Supabase Storage upload + public URL: HIGH — verified via official Supabase docs
- Drizzle schema + migration: HIGH — matches existing project patterns
- Preset template JSON format: HIGH — verified via raw sample.json from GitHub repo
- Unlayer engine version pinning (`1.157.0`): MEDIUM — reported workaround in GitHub issues, not officially documented

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (30 days — Unlayer free tier restrictions could change)
