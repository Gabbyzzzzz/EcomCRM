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
}

// ─── EmailPreviewPanel ────────────────────────────────────────────────────────

/**
 * Live email preview panel that renders the selected email template
 * with current form values. Fetches preview HTML via POST to the
 * preview API with a 500ms debounce on prop changes.
 */
export function EmailPreviewPanel({
  automationId,
  emailTemplateId,
  subject,
  headline,
  body,
  ctaText,
  discountCode,
}: EmailPreviewPanelProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!emailTemplateId) {
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
          emailTemplateId,
          subject,
          headline,
          body,
          ctaText,
          discountCode,
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
  }, [automationId, emailTemplateId, subject, headline, body, ctaText, discountCode])

  // ─── No template configured ─────────────────────────────────────────────

  if (!emailTemplateId) {
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
        {isLoading && (
          <span className="text-xs text-muted-foreground animate-pulse">Updating…</span>
        )}
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
