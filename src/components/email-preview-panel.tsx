'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailPreviewPanelProps {
  automationId: string
  emailTemplateId: string | null
  subject?: string
  headline?: string
  body?: string
  ctaText?: string
  discountCode?: string
  /** Phase 14: UUID of linked email template (Tier 2) */
  linkedEmailTemplateId?: string | null
  /** Phase 14: Flow-specific custom HTML (Tier 1 — highest priority) */
  customTemplateHtml?: string | null
}

// ─── Tier label helper ────────────────────────────────────────────────────────

function TierLabel({ tier }: { tier: 'custom' | 'linked' | 'default' }) {
  const styles = {
    custom: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    linked: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    default: 'bg-muted text-muted-foreground',
  }
  const labels = {
    custom: 'Custom Template',
    linked: 'Linked Template',
    default: 'Default Template',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[tier]}`}
    >
      {labels[tier]}
    </span>
  )
}

// ─── EmailPreviewPanel ────────────────────────────────────────────────────────

/**
 * Live email preview panel with 3-tier template resolution (Phase 14):
 *
 * Tier 1 (custom):  customTemplateHtml is truthy → render directly, no API call
 * Tier 2 (linked):  linkedEmailTemplateId is truthy → fetch from preview endpoint
 * Tier 3 (default): fall through to existing React Email preview (emailTemplateId string)
 *
 * Debounces preview API calls at 500ms on prop changes.
 */
export function EmailPreviewPanel({
  automationId,
  emailTemplateId,
  subject,
  headline,
  body,
  ctaText,
  discountCode,
  linkedEmailTemplateId,
  customTemplateHtml,
}: EmailPreviewPanelProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Determine active tier ────────────────────────────────────────────────
  const hasCustomHtml = !!customTemplateHtml
  const hasLinkedTemplate = !!linkedEmailTemplateId
  const activeTier: 'custom' | 'linked' | 'default' = hasCustomHtml
    ? 'custom'
    : hasLinkedTemplate
      ? 'linked'
      : 'default'

  useEffect(() => {
    // ── Tier 1: Custom HTML — render directly without API call ────────────
    if (hasCustomHtml && customTemplateHtml) {
      setHtml(customTemplateHtml)
      setPreviewSubject(subject ?? null)
      setError(null)
      setIsLoading(false)
      return
    }

    // ── Tier 2 + 3: Need to fetch from preview endpoint ───────────────────
    // Tier 2: linkedEmailTemplateId present → pass to API
    // Tier 3: legacy emailTemplateId string → existing behavior
    const resolvedTemplateId = hasLinkedTemplate ? null : emailTemplateId

    // If neither linked nor legacy template, show empty state
    if (!hasLinkedTemplate && !resolvedTemplateId) {
      setHtml(null)
      return
    }

    // Debounce: clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      setIsLoading(true)
      setError(null)

      fetch(`/api/automations/${automationId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailTemplateId: resolvedTemplateId ?? undefined,
          subject,
          headline,
          body,
          ctaText,
          discountCode,
          // Phase 14 additions
          linkedEmailTemplateId: hasLinkedTemplate ? linkedEmailTemplateId : undefined,
          hasCustomTemplate: false, // Tier 1 is handled client-side above
        }),
      })
        .then((res) => res.json())
        .then((data: { html?: string; subject?: string; error?: string }) => {
          if (data.error) {
            setError(data.error)
            setHtml(null)
            setPreviewSubject(null)
          } else {
            setHtml(data.html ?? null)
            setPreviewSubject(data.subject ?? null)
          }
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Preview failed'
          setError(message)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [
    automationId,
    emailTemplateId,
    subject,
    headline,
    body,
    ctaText,
    discountCode,
    linkedEmailTemplateId,
    customTemplateHtml,
    hasCustomHtml,
    hasLinkedTemplate,
  ])

  // ─── No template configured ─────────────────────────────────────────────

  if (!hasCustomHtml && !hasLinkedTemplate && !emailTemplateId) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium mb-4">Email Preview</h2>
        <div className="flex items-center justify-center h-48 rounded-md border border-dashed border-muted-foreground/30 bg-muted/20">
          <p className="text-sm text-muted-foreground">No email template configured</p>
        </div>
      </div>
    )
  }

  // ─── Preview panel ───────────────────────────────────────────────────────

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Email Preview</h2>
        <div className="flex items-center gap-2">
          <TierLabel tier={activeTier} />
          {isLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">Updating…</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && !html && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      )}

      {/* Subject line */}
      {previewSubject && (
        <div className="mx-auto max-w-[600px] mb-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-2">Subject:</span>
          <span className="text-sm">{previewSubject}</span>
        </div>
      )}

      {/* Email iframe */}
      {html && (
        <div className="mx-auto max-w-[600px] rounded-md border border-border overflow-hidden shadow-sm">
          <iframe
            srcDoc={html}
            title="Email preview"
            className="w-full"
            style={{ height: '600px', border: 'none', display: 'block' }}
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  )
}
