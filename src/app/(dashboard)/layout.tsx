import type { ReactNode } from 'react'
import Link from 'next/link'
import { SyncIndicator } from '@/components/sync-indicator'
import { Toaster } from '@/components/ui/sonner'

// ─── Dashboard Layout ─────────────────────────────────────────────────────────
//
// Server Component wrapper that renders:
//   - A top nav bar with the EcomCRM logo and the SyncIndicator (client)
//   - A left sidebar with navigation links
//   - Page content in the main area
//
// The SyncIndicator is a Client Component — it handles polling, auto-sync,
// and completion toasts. The rest of the layout is a Server Component.

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-col border-r bg-card px-4 py-6 gap-2 shrink-0">
        {/* Logo */}
        <Link
          href="/"
          className="mb-6 flex items-center gap-2 font-semibold text-lg px-2"
        >
          <span className="text-primary">EcomCRM</span>
        </Link>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/customers"
            className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Customers
          </Link>
          <Link
            href="/automations"
            className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Automations
          </Link>
          <Link
            href="/emails"
            className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Email Templates
          </Link>
        </nav>

        {/* Bottom nav */}
        <div className="mt-auto border-t pt-4">
          <Link
            href="/settings/sync"
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
          >
            Settings
          </Link>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top nav bar */}
        <header className="flex h-14 items-center justify-between border-b px-4 bg-card shrink-0">
          {/* Mobile logo */}
          <Link
            href="/"
            className="flex md:hidden items-center gap-2 font-semibold"
          >
            <span className="text-primary">EcomCRM</span>
          </Link>

          {/* Right side — SyncIndicator */}
          <div className="ml-auto flex items-center gap-2">
            <SyncIndicator />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* Toast provider */}
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
