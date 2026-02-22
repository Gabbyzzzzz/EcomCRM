---
phase: 12-open-and-click-tracking
plan: "01"
subsystem: email-tracking
tags: [drizzle, schema, api, tracking, email]
dependency_graph:
  requires: []
  provides:
    - email_clicks table in database
    - GET /api/track/open (open tracking pixel)
    - GET /api/track/click (click redirect endpoint)
    - recordEmailOpen() query helper
    - recordEmailClick() query helper
  affects:
    - src/lib/db/schema.ts
    - src/lib/db/queries.ts
tech_stack:
  added: []
  patterns:
    - Drizzle ORM for schema + migration
    - Best-effort tracking (try/catch, never throw)
    - Idempotent DB updates via isNull() guard
    - 1x1 transparent GIF pixel response
    - NextResponse.redirect for click tracking
key_files:
  created:
    - src/app/api/track/open/route.ts
    - src/app/api/track/click/route.ts
    - drizzle/0006_true_pete_wisdom.sql
  modified:
    - src/lib/db/schema.ts
    - src/lib/db/queries.ts
decisions:
  - "recordEmailOpen and recordEmailClick both wrap in try/catch — tracking is best-effort and should never break email delivery"
  - "opened_at and clicked_at updates guarded by isNull() — idempotent, only first event recorded on parent row"
  - "email_clicks table records every click individually (multi-click) while messageLogs.clicked_at is first-click only"
  - "UUID regex validation before DB calls — invalid IDs are silently ignored, pixel/redirect still served"
  - "Click route records only when url param is valid http(s) URL — fallback to APP_URL skips DB write"
metrics:
  duration: "2 min"
  completed: "2026-02-22"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
---

# Phase 12 Plan 01: Email Open and Click Tracking Infrastructure Summary

**One-liner:** Drizzle email_clicks table with FK to messageLogs, migration applied, and two tracking API endpoints (1x1 GIF pixel + 302 click redirect) with idempotent, best-effort DB writes.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add email_clicks table to schema and tracking query helpers | 25957ba | schema.ts, queries.ts, 0006_true_pete_wisdom.sql |
| 2 | Create tracking pixel and click-redirect API endpoints | ff8bc44 | api/track/open/route.ts, api/track/click/route.ts |

## What Was Built

### email_clicks Table (schema.ts)
Added `emailClicks` Drizzle table with:
- `id`: uuid PK (defaultRandom)
- `shopId`: varchar(255) NOT NULL
- `messageLogId`: uuid NOT NULL, FK to messageLogs.id
- `linkUrl`: text NOT NULL
- `clickedAt`: timestamp with timezone, defaultNow, NOT NULL
- Indexes: shopId, messageLogId, clickedAt

Migration `0006_true_pete_wisdom.sql` generated and applied — table exists in database.

### Query Helpers (queries.ts)
- `recordEmailOpen(messageLogId)`: Updates `messageLogs.opened_at = NOW(), status = 'opened'` WHERE `opened_at IS NULL` (idempotent). Best-effort (try/catch, never throws).
- `recordEmailClick(shopId, messageLogId, linkUrl)`: Inserts into `emailClicks` + updates `messageLogs.clicked_at = NOW(), status = 'clicked'` WHERE `clicked_at IS NULL` (first click only). Best-effort (try/catch, never throws).

### GET /api/track/open (open/route.ts)
- Reads `id` param (message_log UUID)
- Validates UUID format via regex
- Calls `recordEmailOpen(id)` if valid
- Returns 43-byte 1x1 transparent GIF with `Content-Type: image/gif` and `Cache-Control: no-store` headers
- Always returns the pixel — never errors on invalid input
- `force-dynamic` + `nodejs` runtime

### GET /api/track/click (click/route.ts)
- Reads `id` and `url` params
- Validates `url` starts with `http://` or `https://`
- Validates `id` UUID format
- Calls `recordEmailClick(shopId, id, url)` if both are valid
- Falls back to `APP_URL` if url is missing/invalid (skips DB write)
- Returns `NextResponse.redirect(destinationUrl, 302)`
- `force-dynamic` + `nodejs` runtime

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed click recording condition**
- **Found during:** Task 2 implementation review
- **Issue:** Initial condition `destinationUrl !== fallbackUrl` would miss recording when a valid URL happens to equal APP_URL
- **Fix:** Replaced with `isValidUrl` boolean flag derived from original url param validity check — cleaner and correct
- **Files modified:** src/app/api/track/click/route.ts
- **Commit:** ff8bc44

## Verification Results

1. `npx tsc --noEmit` — PASS (zero errors)
2. `emailClicks` table: id (uuid PK), shopId, messageLogId (FK messageLogs), linkUrl (text), clickedAt (timestamp) — PASS
3. `recordEmailOpen` uses `isNull(messageLogs.openedAt)` guard — idempotent — PASS
4. `recordEmailClick` inserts email_clicks row + updates messageLogs.clicked_at with `isNull()` guard — PASS
5. `/api/track/open` exports GET, returns image/gif with Cache-Control no-store — PASS
6. `/api/track/click` exports GET, validates http(s), returns 302 redirect — PASS
7. Both endpoints handle missing/invalid params without throwing — PASS
8. Migration `0006_true_pete_wisdom.sql` applied to database — PASS

## Self-Check: PASSED

Files confirmed to exist:
- [FOUND] src/lib/db/schema.ts (emailClicks table)
- [FOUND] src/lib/db/queries.ts (recordEmailOpen, recordEmailClick)
- [FOUND] src/app/api/track/open/route.ts
- [FOUND] src/app/api/track/click/route.ts
- [FOUND] drizzle/0006_true_pete_wisdom.sql

Commits confirmed:
- [FOUND] 25957ba — Task 1 (schema, migration, queries)
- [FOUND] ff8bc44 — Task 2 (tracking endpoints)
