'use client'

export function SeedAutomationsButton() {
  async function handleSeed() {
    await fetch('/api/automations/seed', { method: 'POST' })
    window.location.reload()
  }

  return (
    <button
      onClick={handleSeed}
      className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
    >
      Seed preset flows
    </button>
  )
}
