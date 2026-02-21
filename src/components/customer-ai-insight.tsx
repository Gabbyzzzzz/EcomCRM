'use client'

import { useState, useEffect } from 'react'

interface CustomerAiInsightProps {
  customerId: string
}

export function CustomerAiInsight({ customerId }: CustomerAiInsightProps) {
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchInsight() {
      setLoading(true)
      setError(false)

      try {
        const res = await fetch(`/api/customers/${customerId}/insights`)

        if (!cancelled) {
          if (!res.ok) {
            setError(true)
          } else {
            const data = (await res.json()) as { insight?: string }
            setInsight(data.insight ?? null)
          }
        }
      } catch {
        if (!cancelled) {
          setError(true)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchInsight()

    return () => {
      cancelled = true
    }
  }, [customerId, refreshKey])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">AI Insight</h2>
        {!loading && (
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Regenerate
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 animate-pulse" aria-busy="true">
          <div className="h-4 rounded bg-muted w-full" />
          <div className="h-4 rounded bg-muted w-4/5" />
          <div className="h-4 rounded bg-muted w-3/5" />
        </div>
      ) : error || insight == null ? (
        <p className="text-sm text-muted-foreground">Unable to generate insight at this time.</p>
      ) : (
        <p className="text-sm text-foreground leading-relaxed">{insight}</p>
      )}
    </div>
  )
}
