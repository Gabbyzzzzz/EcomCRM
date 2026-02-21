'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Suggestion {
  subjectLine: string
  bodyPreview: string
}

interface Props {
  automationId: string
  emailTemplateId: string | null
}

export function EmailCopyGenerator({ automationId, emailTemplateId }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setSuggestions([])

    try {
      const res = await fetch(`/api/automations/${automationId}/generate-copy`, {
        method: 'POST',
      })

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`)
      }

      const data = (await res.json()) as { suggestions: Suggestion[] }
      setSuggestions(data.suggestions ?? [])
    } catch (err) {
      console.error('[EmailCopyGenerator] Error generating suggestions:', err)
      setError('Failed to generate suggestions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const noTemplate = emailTemplateId === null

  return (
    <div className="space-y-4">
      {noTemplate && (
        <p className="text-sm text-muted-foreground">
          This automation does not use email templates.
        </p>
      )}

      <Button
        onClick={handleGenerate}
        disabled={loading || noTemplate}
        variant="default"
      >
        {loading ? 'Generating...' : 'Generate Suggestions'}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="rounded-lg border bg-muted/30 p-4"
            >
              <p className="font-semibold text-sm">{s.subjectLine}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.bodyPreview}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        These are AI-generated suggestions. Review and customize before using.
      </p>
    </div>
  )
}
