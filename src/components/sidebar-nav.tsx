'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboardIcon,
  UsersIcon,
  ZapIcon,
  MailIcon,
  SettingsIcon,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboardIcon },
  { href: '/customers', label: 'Customers', icon: UsersIcon },
  { href: '/automations', label: 'Automations', icon: ZapIcon },
  { href: '/emails', label: 'Email Templates', icon: MailIcon },
]

export function SidebarNav() {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      <nav className="flex flex-col gap-1 text-sm">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-3 py-2 flex items-center gap-2.5 transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto border-t pt-4">
        <Link
          href="/settings/sync"
          className={`rounded-md px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${
            pathname.startsWith('/settings')
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <SettingsIcon className="h-4 w-4 shrink-0" />
          Settings
        </Link>
      </div>
    </>
  )
}
