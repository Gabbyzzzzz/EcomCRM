'use client'

import { useState } from 'react'

interface SendTestEmailButtonProps {
  automationId: string
  /** Current subject line from the config form (unsaved edits included) */
  subject?: string
  /** Current headline from the config form (unsaved edits included) */
  headline?: string
  /** Current body text from the config form (unsaved edits included). Named bodyText to avoid collision with fetch body parameter. */
  bodyText?: string
  /** Current CTA text from the config form (unsaved edits included) */
  ctaText?: string
  /** Current discount code from the config form (unsaved edits included) */
  discountCode?: string
}

export function SendTestEmailButton({
  automationId,
  subject,
  headline,
  bodyText,
  ctaText,
  discountCode,
}: SendTestEmailButtonProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [resendId, setResendId] = useState<string | null>(null)

  async function handleSend() {
    if (!email) return
    setStatus('sending')
    setError(null)
    setResendId(null)

    try {
      const res = await fetch(`/api/automations/${automationId}/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          ...(subject ? { subject } : {}),
          ...(headline ? { headline } : {}),
          ...(bodyText ? { body: bodyText } : {}),
          ...(ctaText ? { ctaText } : {}),
          ...(discountCode ? { discountCode } : {}),
        }),
      })
      const json = await res.json() as { sent?: boolean; resendId?: string; error?: string }

      if (!res.ok || !json.sent) {
        setError(json.error ?? 'Send failed')
        setStatus('error')
      } else {
        setResendId(json.resendId ?? null)
        setStatus('sent')
      }
    } catch {
      setError('Network error — check the console')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setStatus('idle')
            setError(null)
          }}
          placeholder="your@email.com"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={status === 'sending'}
        />
        <button
          onClick={handleSend}
          disabled={status === 'sending' || !email}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'sending' ? 'Sending…' : 'Send'}
        </button>
      </div>

      {status === 'sent' && (
        <p className="text-sm text-green-600 dark:text-green-400">
          ✓ Test email sent{resendId ? ` (Resend ID: ${resendId})` : ''}
        </p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400">
          ✗ {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Sends a test version of this automation&apos;s email template. Bypasses suppression lists.
      </p>
    </div>
  )
}
