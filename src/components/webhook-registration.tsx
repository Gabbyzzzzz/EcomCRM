'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

interface WebhookResult {
  topic: string
  status: 'registered' | 'already_exists' | 'error'
  message?: string
}

export function WebhookRegistration() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<WebhookResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    setLoading(true)
    setResults(null)
    setError(null)
    try {
      const res = await fetch('/api/webhooks/register', { method: 'POST' })
      const data = (await res.json()) as { results?: WebhookResult[]; error?: string }
      if (data.results) {
        setResults(data.results)
      } else {
        setError(data.error ?? 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-5 flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Registers the following webhooks pointing to{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/webhooks/shopify</code>:
        </p>
        <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside space-y-0.5">
          <li>orders/create</li>
          <li>customers/create</li>
          <li>customers/update</li>
        </ul>
      </div>

      <div>
        <Button
          variant="outline"
          onClick={handleRegister}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {loading ? 'Registering…' : 'Register Webhooks'}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {results && (
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.topic} className="flex items-start gap-2 text-sm">
              {r.status === 'registered' ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              ) : r.status === 'already_exists' ? (
                <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              )}
              <div>
                <span className="font-mono text-xs">{r.topic}</span>
                {r.status === 'registered' && (
                  <span className="ml-2 text-green-600 text-xs">Registered</span>
                )}
                {r.status === 'already_exists' && (
                  <span className="ml-2 text-blue-600 text-xs">Already registered</span>
                )}
                {r.status === 'error' && (
                  <span className="ml-2 text-destructive text-xs">{r.message}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
