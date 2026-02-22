---
phase: 13-email-template-editor
plan: 02
subsystem: ui, api, storage
tags: [react-email-editor, unlayer, supabase-storage, nextjs, email-editor]

# Dependency graph
requires:
  - phase: 13-01
    provides: email_templates table, getEmailTemplate query, PUT /api/email-templates/[id]
provides:
  - UnlayerEditor client component at src/components/email-editor/UnlayerEditor.tsx
  - POST /api/uploads/image endpoint (Supabase Storage upload, public URL return)
  - /emails/[id]/edit Server Component page (loads template, renders UnlayerEditor)
  - /emails/[id] redirect page (redirects to /emails/[id]/edit)
affects:
  - 13-03 (preset templates - editor available to use with seeded templates)
  - 14-automation-template-linking (editor URL pattern /emails/[id]/edit is the canonical edit URL)

# Tech tracking
tech-stack:
  added:
    - react-email-editor@1.7.11 (Unlayer drag-and-drop email editor React wrapper)
  patterns:
    - dynamic import with ssr:false for browser-only libraries (Unlayer uses window)
    - designLoadedRef useRef pattern to prevent React StrictMode double-fire of loadDesign
    - Promise-wrapped exportHtml for clean async/await flow in handleSave
    - Service-role Supabase client for server-side-only storage operations

key-files:
  created:
    - src/components/email-editor/UnlayerEditor.tsx
    - src/app/api/uploads/image/route.ts
    - src/app/(dashboard)/emails/[id]/edit/page.tsx
  modified:
    - src/app/(dashboard)/emails/[id]/page.tsx (replaced static template preview with redirect)

key-decisions:
  - "Unlayer engine pinned to version 1.157.0 — registerCallback('image') only works on free tier with pinned version, not 'latest'"
  - "designLoadedRef useRef(false) guards against StrictMode double-mount calling loadDesign twice"
  - "Image upload API uses service-role key (SUPABASE_SERVICE_ROLE_KEY) — server-side only, never exposed to browser"
  - "ExportHtmlResult typed inline as { html: string; design: object } to satisfy strict TypeScript without importing internal unlayer-types"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 13 Plan 02: Unlayer Email Editor Integration Summary

**Unlayer drag-and-drop editor at /emails/[id]/edit with save/load of HTML + Design JSON and image upload to Supabase Storage**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T05:29:38Z
- **Completed:** 2026-02-22T05:32:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Installed react-email-editor@1.7.11
- Created UnlayerEditor client component: dynamic import (ssr:false), StrictMode-safe design loading, image upload callback via registerCallback('image'), Promise-wrapped exportHtml for async save
- Unlayer engine pinned to version 1.157.0 for free-tier image upload support
- Created POST /api/uploads/image: validates MIME type (jpeg/png/gif/webp/svg) and size (5MB max), uploads to Supabase Storage email-assets bucket, returns { url: publicUrl }
- Created /emails/[id]/edit Server Component: loads template from DB via getEmailTemplate, renders UnlayerEditor with templateId/templateName/initialDesign
- Replaced /emails/[id] static template preview page with simple redirect to /emails/[id]/edit

## Task Commits

Each task was committed atomically:

1. **Task 1: Install react-email-editor, create UnlayerEditor component and image upload API** - `d19b949` (feat)
2. **Task 2: Create editor page at /emails/[id]/edit and redirect from /emails/[id]** - `683dcaf` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/email-editor/UnlayerEditor.tsx` - Client component with dynamic import, onReady callback, image upload registration, save handler with exportHtml
- `src/app/api/uploads/image/route.ts` - POST endpoint for image uploads to Supabase Storage email-assets bucket
- `src/app/(dashboard)/emails/[id]/edit/page.tsx` - Server Component loading template from DB, rendering UnlayerEditor
- `src/app/(dashboard)/emails/[id]/page.tsx` - Replaced with redirect to /emails/[id]/edit

## Decisions Made

- Unlayer engine pinned to 1.157.0 — `registerCallback('image')` only works on free tier with a pinned version, not 'latest'.
- `designLoadedRef` as `useRef<boolean>(false)` guards against React StrictMode double-mounting calling `loadDesign` twice — only loads design on first render.
- Image upload route uses `SUPABASE_SERVICE_ROLE_KEY` (service role) for the Supabase client — server-side only, storage bucket policy enforced server-side.
- `ExportHtmlResult` typed inline as `{ html: string; design: object }` in the exportHtml callback to satisfy TypeScript strict mode without importing internal unlayer-types declarations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Typed exportHtml callback parameter explicitly to satisfy TypeScript strict mode**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** The `d` parameter in `exportHtml((d) => ...)` implicitly had type `any` under TypeScript strict mode (`noImplicitAny: true`)
- **Fix:** Added inline type annotation `(d: { html: string; design: object })` — matches the unlayer-types `ExportHtmlResult` interface fields used
- **Files modified:** `src/components/email-editor/UnlayerEditor.tsx`
- **Committed in:** d19b949 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (TypeScript strict mode compliance)
**Impact on plan:** Zero scope change — same behavior, just explicit types.

## User Setup Required

**REQUIRED before image uploads work:**

Create `email-assets` bucket as PUBLIC in Supabase Dashboard:
1. Go to Supabase Dashboard -> Storage
2. Click "New bucket"
3. Name: `email-assets`
4. Toggle "Public bucket" ON
5. Click Create

Without this, image uploads in the editor will return 500 errors. The editor itself loads and saves without the bucket.

## Next Phase Readiness

- /emails/[id]/edit fully functional with Unlayer drag-and-drop editor
- Save persists HTML + Design JSON to database via PUT /api/email-templates/[id]
- Reopening a saved template restores the design from designJson
- Image upload API ready (requires email-assets bucket in Supabase)
- Plan 03 (preset templates) can use the editor immediately after seeding

---
*Phase: 13-email-template-editor*
*Completed: 2026-02-22*

## Self-Check: PASSED
