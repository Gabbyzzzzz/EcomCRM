import {
  getDashboardKpis,
  getSegmentDistribution,
  getRevenueOverTime,
  getChurnAlerts,
  getRecentActivity,
} from '@/lib/db/queries'
import { env } from '@/lib/env'
import { SegmentChart } from '@/components/segment-chart'
import { RevenueChart } from '@/components/revenue-chart'
import Link from 'next/link'
import Decimal from 'decimal.js'

export const metadata = { title: 'Dashboard | EcomCRM' }

// ─── Relative time helper ──────────────────────────────────────────────────────

function relativeTime(date: Date | null): string {
  if (!date) return 'Unknown'
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ─── Segment badge colors ─────────────────────────────────────────────────────

const SEGMENT_BADGE: Record<string, string> = {
  at_risk: 'bg-amber-100 text-amber-800',
  hibernating: 'bg-orange-100 text-orange-800',
  lost: 'bg-red-100 text-red-800',
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ')
}

// ─── Dashboard page ────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const shopId = new URL(env.SHOPIFY_STORE_URL).hostname

  const [kpis, segmentData, revenueData, churnAlerts, activity] =
    await Promise.all([
      getDashboardKpis(shopId),
      getSegmentDistribution(shopId),
      getRevenueOverTime(shopId, 90),
      getChurnAlerts(shopId, 7),
      getRecentActivity(shopId, 20),
    ])

  // ── Recent Activity: merge messages + orders into single timeline ─────────
  type ActivityItem =
    | { type: 'email'; id: string; customerName: string | null; subject: string | null; status: string; time: Date | null }
    | { type: 'order'; id: string; customerName: string | null; totalPrice: string | null; time: Date | null }

  const allActivity: ActivityItem[] = [
    ...activity.messages.map((m) => ({
      type: 'email' as const,
      id: m.id,
      customerName: m.customerName,
      subject: m.subject,
      status: m.status,
      time: m.sentAt,
    })),
    ...activity.orders.map((o) => ({
      type: 'order' as const,
      id: o.id,
      customerName: o.customerName,
      totalPrice: o.totalPrice,
      time: o.createdAt,
    })),
  ]
    .sort((a, b) => (b.time?.getTime() ?? 0) - (a.time?.getTime() ?? 0))
    .slice(0, 15)

  const displayedChurns = churnAlerts.slice(0, 10)
  const churnOverflow = churnAlerts.length - displayedChurns.length

  return (
    <div className="flex flex-col gap-6">
      {/* ── Heading ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live CRM metrics for your Shopify store
        </p>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Total Customers
          </p>
          <p className="text-2xl font-semibold">
            {kpis.totalCustomers.toLocaleString()}
          </p>
        </div>

        {/* Total Revenue */}
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Total Revenue
          </p>
          <p className="text-2xl font-semibold">
            ${new Decimal(kpis.totalRevenue).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          </p>
        </div>

        {/* New Customers (30d) */}
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            New Customers (30d)
          </p>
          <p className="text-2xl font-semibold">
            {kpis.newCustomers30d.toLocaleString()}
          </p>
        </div>

        {/* Emails Sent (30d) */}
        <div className="rounded-lg border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Emails Sent (30d)
          </p>
          <p className="text-2xl font-semibold">
            {kpis.emailsSent30d.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Segment Distribution */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold">Segment Distribution</h2>
            {/* CSS-only info tooltip */}
            <div className="group relative inline-flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5 text-muted-foreground cursor-help"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-80 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-md">
                <p className="font-medium mb-2">How segments work</p>
                <p className="text-muted-foreground mb-2">
                  Customers are scored 1–5 on Recency (R), Frequency (F), and Monetary (M) via quintile ranking, then assigned a segment:
                </p>
                <ul className="flex flex-col gap-1">
                  <li><span className="font-medium">Champion</span> <span className="text-muted-foreground">— R≥4, F≥4, M≥4. Best customers: recent, frequent, high-spend.</span></li>
                  <li><span className="font-medium">Loyal</span> <span className="text-muted-foreground">— R≥3, F≥3, M≥3. Consistent buyers with solid spend.</span></li>
                  <li><span className="font-medium">New</span> <span className="text-muted-foreground">— R≥4, F≤1. Bought recently for the first time.</span></li>
                  <li><span className="font-medium">Potential</span> <span className="text-muted-foreground">— R≥3, other criteria. Recent but not yet loyal.</span></li>
                  <li><span className="font-medium">At Risk</span> <span className="text-muted-foreground">— R≤2, F≥2. Used to buy regularly but drifting away.</span></li>
                  <li><span className="font-medium">Hibernating</span> <span className="text-muted-foreground">— R≤2, F≤2, M≥2. Long inactive with decent lifetime spend.</span></li>
                  <li><span className="font-medium">Lost</span> <span className="text-muted-foreground">— Everything else. Low recency, frequency, and spend.</span></li>
                </ul>
                {/* Tooltip arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-border" />
              </div>
            </div>
          </div>
          <SegmentChart data={segmentData} />
        </div>

        {/* Revenue Over Time */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-semibold mb-4">Revenue (Last 90 Days)</h2>
          <RevenueChart data={revenueData} />
        </div>
      </div>

      {/* ── Churn Alerts ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold">Churn Alerts</h2>
          {churnAlerts.length > 0 && (
            <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium">
              {churnAlerts.length} customer{churnAlerts.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {churnAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No churn alerts in the last 7 days.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {displayedChurns.map((c) => (
              <li key={c.id} className="flex items-center gap-3 text-sm">
                <Link
                  href={`/customers/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.name ?? c.email ?? 'Unknown'}
                </Link>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEGMENT_BADGE[c.segment] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {capitalize(c.segment)}
                </span>
              </li>
            ))}
            {churnOverflow > 0 && (
              <li className="text-xs text-muted-foreground">
                +{churnOverflow} more
              </li>
            )}
          </ul>
        )}
      </div>

      {/* ── Recent Activity ───────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold mb-4">Recent Activity</h2>

        {allActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {allActivity.map((item) => (
              <li key={`${item.type}-${item.id}`} className="flex items-start gap-3 text-sm">
                {/* Type indicator */}
                <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-mono font-medium bg-muted text-muted-foreground">
                  {item.type === 'email' ? 'Email' : 'Order'}
                </span>

                {/* Description */}
                <span className="flex-1 text-foreground">
                  {item.type === 'email'
                    ? `Sent "${item.subject ?? 'email'}" to ${item.customerName ?? 'customer'}`
                    : `Order ${item.totalPrice != null ? `$${new Decimal(item.totalPrice).toFixed(2)}` : ''} by ${item.customerName ?? 'customer'}`}
                </span>

                {/* Relative time */}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(item.time)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
