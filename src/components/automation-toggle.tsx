'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function AutomationToggle({ id, enabled }: { id: string; enabled: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function toggle() {
    await fetch(`/api/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    })
    startTransition(() => router.refresh())
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        enabled ? 'bg-primary' : 'bg-muted'
      } disabled:opacity-50`}
      aria-label={enabled ? 'Disable automation' : 'Enable automation'}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
