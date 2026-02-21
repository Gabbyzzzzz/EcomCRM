'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function AutomationToggle({ id, enabled }: { id: string; enabled: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState(enabled)
  const [error, setError] = useState(false)

  async function toggle() {
    const next = !optimistic
    setOptimistic(next)
    setError(false)

    const res = await fetch(`/api/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    })

    if (!res.ok) {
      setOptimistic(!next) // revert
      setError(true)
      return
    }

    startTransition(() => router.refresh())
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggle}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          optimistic ? 'bg-primary' : 'bg-muted'
        } disabled:opacity-50`}
        aria-label={optimistic ? 'Disable automation' : 'Enable automation'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            optimistic ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      {error && <span className="text-xs text-red-500">Failed</span>}
    </div>
  )
}
