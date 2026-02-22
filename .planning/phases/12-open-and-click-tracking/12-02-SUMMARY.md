---
phase: 12-open-and-click-tracking
plan: "02"
subsystem: email-tracking
tags: [email, tracking, drizzle, ui, lucide-react]
dependency_graph:
  requires:
    - "12-01 (email_clicks table, recordEmailOpen, recordEmailClick, tracking endpoints)"
  provides:
    - "Tracking pixel injection in sendMarketingEmail"
    - "Link rewriting in sendMarketingEmail (click tracking)"
    - "getAutomationEmailStats query function"
    - "Customer profile Engagement column with status icons"
    - "Automation detail Email Performance section with open/click rates"
  affects:
    - src/lib/email/send.ts
    - src/lib/db/queries.ts
    - src/app/(dashboard)/customers/[id]/page.tsx
    - src/app/(dashboard)/automations/[id]/page.tsx
tech_stack:
  added: []
  patterns:
    - Pre-insert MessageLog with .returning() to get ID before Resend call
    - Regex-based HTML link rewriting (skip /unsubscribe, mailto:, #, non-http)
    - SQL FILTER clause for efficient single-pass aggregation
    - lucide-react status icons in table cells
    - Promise.all for concurrent data fetching on server components
key_files:
  created: []
  modified:
    - src/lib/email/send.ts
    - src/lib/db/queries.ts
    - src/app/(dashboard)/customers/[id]/page.tsx
    - src/app/(dashboard)/automations/[id]/page.tsx
decisions:
  - "MessageLog pre-inserted before Resend call so messageLogId is available for tracking URLs — on Resend failure, UPDATE pre-inserted row to 'failed' (no second INSERT)"
  - "Unsubscribe links skipped by rewriteLinks by checking url.includes('/unsubscribe') — compliance requirement, not just a preference"
  - "Apple MPP limitation documented in both a code comment in send.ts and in the automation detail UI text"
  - "getAutomationEmailStats uses SQL FILTER WHERE clauses — single-pass aggregation, no subqueries"
metrics:
  duration: "2 min"
  completed: "2026-02-22"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 4
---

# Phase 12 Plan 02: Tracking Pipeline and UI Engagement Summary

**One-liner:** Restructured sendMarketingEmail to pre-insert MessageLog and use its UUID for 1x1 pixel + link rewriting, then surfaced engagement data in customer profile (lucide-react icon column) and automation detail (5-stat performance card).

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Inject tracking pixel and rewrite links in sendMarketingEmail | 9543c78 | src/lib/email/send.ts |
| 2 | Update customer profile message history and add open/click rates to automation detail | a1bdc02 | queries.ts, customers/[id]/page.tsx, automations/[id]/page.tsx |

## What Was Built

### sendMarketingEmail Restructured (send.ts)

The key architectural change: MessageLog is now pre-inserted (Step 7) with `.returning({ id: messageLogs.id })` before the Resend call. This gives us the `messageLogId` UUID needed for tracking URLs.

**New helpers:**
- `injectTrackingPixel(html, messageLogId)`: Inserts `<img src="{APP_URL}/api/track/open?id={messageLogId}" .../>` before `</body>` tag (or appends if no body tag). Documents Apple MPP limitation in code comment.
- `rewriteLinks(html, messageLogId)`: Regex replaces `href="..."` in anchor tags with `{APP_URL}/api/track/click?id={messageLogId}&url={encodedOriginalUrl}`. Skips: URLs containing `/unsubscribe`, `mailto:` links, `#` anchor links, non-http(s) URLs.

**Flow change (Steps 7-9):**
1. Pre-insert MessageLog → get `messageLogId`
2. Apply `rewriteLinks(injectTrackingPixel(html, id), id)` → `trackedHtml`
3. Send `trackedHtml` via Resend
4. On Resend error: `UPDATE messageLogs SET status='failed' WHERE id=messageLogId` (no new INSERT)
5. On catch: same UPDATE pattern

### getAutomationEmailStats (queries.ts)

New exported function + interface:
```typescript
export interface AutomationEmailStats {
  totalSent: number
  totalOpened: number
  totalClicked: number
  openRate: number    // 0-100 percentage
  clickRate: number   // 0-100 percentage
}
```

Uses a single SQL query with `FILTER` clauses:
- `COUNT(*) FILTER (WHERE status IN ('sent','opened','clicked','converted'))` → totalSent
- `COUNT(*) FILTER (WHERE opened_at IS NOT NULL)` → totalOpened
- `COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)` → totalClicked

openRate and clickRate computed as `Math.round((n / totalSent) * 100)` with zero-guard.

### Customer Profile Engagement Column (customers/[id]/page.tsx)

Replaced the separate "Opened" and "Clicked" table columns with a single "Engagement" column using lucide-react icons:
- `Link2Icon` + "Clicked" + timestamp (blue) — when `clickedAt` is set
- `EyeIcon` + "Opened" + timestamp (green) — when `openedAt` is set (and no click)
- `CheckIcon` + "Sent" (muted) — when `status === 'sent'` and no open/click yet
- `null` — for suppressed/failed statuses

### Automation Detail Email Performance (automations/[id]/page.tsx)

Added `getAutomationEmailStats` import and concurrent fetch:
```typescript
const [automationRows, stats] = await Promise.all([
  db.select()...limit(1),
  getAutomationEmailStats(shopId, id),
])
```

New "Email Performance" section (before Configuration section) with 5 stat cards:
- Total Sent, Opened, Clicked, Open Rate (%), Click Rate (%)
- MPP caveat text: "Open rates may be inflated by Apple Mail Privacy Protection (MPP). Click rate is the more reliable metric."

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

1. `npx tsc --noEmit` — PASS (zero errors)
2. `injectTrackingPixel` adds `<img src="{APP_URL}/api/track/open?id=xxx" .../>` before `</body>` — PASS
3. `rewriteLinks` rewrites http(s) hrefs to `/api/track/click?id=xxx&url=encodedUrl` — PASS
4. `rewriteLinks` skips URLs containing `/unsubscribe` — PASS (compliance)
5. MessageLog pre-inserted with `.returning()` to get id — PASS
6. On Resend failure: UPDATE pre-inserted row to 'failed', not INSERT — PASS
7. MPP limitation documented in code comment and automation detail UI — PASS
8. Customer profile has single "Engagement" column replacing Opened + Clicked columns — PASS
9. Automation detail has "Email Performance" section with 5 metric cards — PASS
10. `getAutomationEmailStats` uses SQL FILTER clause for efficient aggregation — PASS

## Self-Check: PASSED

Files confirmed to exist:
- [FOUND] src/lib/email/send.ts (injectTrackingPixel, rewriteLinks, pre-insert flow)
- [FOUND] src/lib/db/queries.ts (getAutomationEmailStats)
- [FOUND] src/app/(dashboard)/customers/[id]/page.tsx (Engagement column)
- [FOUND] src/app/(dashboard)/automations/[id]/page.tsx (Email Performance section)

Commits confirmed:
- [FOUND] 9543c78 — Task 1 (send.ts restructure)
- [FOUND] a1bdc02 — Task 2 (queries + UI)
