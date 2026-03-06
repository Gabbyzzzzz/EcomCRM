import type { ReactNode } from 'react'
import Link from 'next/link'
import { SyncIndicator } from '@/components/sync-indicator'
import { SidebarNav } from '@/components/sidebar-nav'
import { Toaster } from '@/components/ui/sonner'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r bg-card px-4 py-6 gap-2 shrink-0">
        <Link
          href="/"
          className="mb-6 flex items-center gap-2 font-semibold text-lg px-2"
        >
          <span className="text-primary">EcomCRM</span>
        </Link>

        <SidebarNav />
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b px-4 bg-card shrink-0">
          <Link
            href="/"
            className="flex md:hidden items-center gap-2 font-semibold"
          >
            <span className="text-primary">EcomCRM</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <SyncIndicator />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      <Toaster richColors position="bottom-right" />
    </div>
  )
}
