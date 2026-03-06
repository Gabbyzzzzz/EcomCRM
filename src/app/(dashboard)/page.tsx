import {
  getDashboardKpis,
  getSegmentDistribution,
  getRevenueOverTime,
  getChurnAlerts,
  getRecentActivity,
  getEmailPerformanceKpis,
} from '@/lib/db/queries'
import { env } from '@/lib/env'
import { SegmentChart } from '@/components/segment-chart'
import { RevenueChart } from '@/components/revenue-chart'
import { InfoPopover } from '@/components/info-popover'
import Link from 'next/link'
import Decimal from 'decimal.js'
import {
  UsersIcon,
  DollarSignIcon,
  UserPlusIcon,
  SendIcon,
  MailIcon,
  EyeIcon,
  MousePointerClickIcon,
  ShoppingCartIcon,
  ArrowUpRightIcon,
  DatabaseIcon,
} from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard | EcomCRM' }

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

const SEGMENT_BADGE: Record<string, string> = {
  at_risk: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  hibernating: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ')
}

export default async function DashboardPage() {
  const shopId = new URL(env.SHOPIFY_STORE_URL).hostname

  const [kpis, segmentData, revenueData, churnAlerts, activity, emailPerf] =
    await Promise.all([
      getDashboardKpis(shopId),
      getSegmentDistribution(shopId),
      getRevenueOverTime(shopId, 90),
      getChurnAlerts(shopId, 7),
      getRecentActivity(shopId, 20),
      getEmailPerformanceKpis(shopId, 30),
    ])

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
    <div className="flex flex-col gap-8">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live CRM metrics for your Shopify store
        </p>
      </div>

      {kpis.totalCustomers === 0 ? (
        /* Empty state */
        <div className="rounded-lg border bg-card p-16 text-center flex flex-col items-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <DatabaseIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium mb-2">No customers yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Connect and sync your Shopify store to import customers, orders, and start seeing CRM metrics on this dashboard.
          </p>
          <a
            href="/settings/sync"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Go to Sync Settings
            <ArrowUpRightIcon className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total Customers
                </p>
                <div className="rounded-md bg-blue-100 dark:bg-blue-900/30 p-1.5">
                  <UsersIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-2xl font-semibold tabular-nums">
                {kpis.totalCustomers.toLocaleString()}
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total Revenue
                </p>
                <div className="rounded-md bg-green-100 dark:bg-green-900/30 p-1.5">
                  <DollarSignIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-2xl font-semibold tabular-nums">
                ${new Decimal(kpis.totalRevenue).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  New Customers (30d)
                </p>
                <div className="rounded-md bg-purple-100 dark:bg-purple-900/30 p-1.5">
                  <UserPlusIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-2xl font-semibold tabular-nums">
                {kpis.newCustomers30d.toLocaleString()}
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Emails Sent (30d)
                </p>
                <div className="rounded-md bg-amber-100 dark:bg-amber-900/30 p-1.5">
                  <SendIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-2xl font-semibold tabular-nums">
                {kpis.emailsSent30d.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Email Performance */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-sm font-semibold mb-1">Email Performance</h2>
            <p className="text-xs text-muted-foreground mb-5">
              Last 30 days. Open rates may be inflated by Apple Mail Privacy Protection.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-blue-100 dark:bg-blue-900/30 p-2">
                  <MailIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Sent</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {emailPerf.totalSent.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-green-100 dark:bg-green-900/30 p-2">
                  <EyeIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Open Rate</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {emailPerf.openRate}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-amber-100 dark:bg-amber-900/30 p-2">
                  <MousePointerClickIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Click Rate</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {emailPerf.clickRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-semibold">Segment Distribution</h2>
                <InfoPopover side="bottom" align="start" width="w-80">
                  <p className="font-medium mb-2">How segments work</p>
                  <p className="text-muted-foreground mb-2">
                    Customers with orders are scored 1-5 on Recency (R), Frequency (F), and Monetary (M) via quintile ranking, then assigned a segment:
                  </p>
                  <ul className="flex flex-col gap-1">
                    <li><span className="font-medium">Champion</span>{' '}<span className="text-muted-foreground">{'— R\u22654, F\u22654, M\u22654. Best customers: recent, frequent, high-spend.'}</span></li>
                    <li><span className="font-medium">Loyal</span>{' '}<span className="text-muted-foreground">{'— R\u22653, F\u22653, M\u22653. Consistent buyers with solid spend.'}</span></li>
                    <li><span className="font-medium">New</span>{' '}<span className="text-muted-foreground">{'— R\u22654, F\u22641. Bought recently for the first time.'}</span></li>
                    <li><span className="font-medium">Potential</span>{' '}<span className="text-muted-foreground">{'— R\u22653, other criteria. Recent but not yet loyal.'}</span></li>
                    <li><span className="font-medium">At Risk</span>{' '}<span className="text-muted-foreground">{'— R\u22642, F\u22652. Used to buy regularly but drifting away.'}</span></li>
                    <li><span className="font-medium">Hibernating</span>{' '}<span className="text-muted-foreground">{'— R\u22642, F\u22642, M\u22652. Long inactive with decent lifetime spend.'}</span></li>
                    <li><span className="font-medium">Lost</span>{' '}<span className="text-muted-foreground">{'— Everything else. Low recency, frequency, and spend.'}</span></li>
                  </ul>
                </InfoPopover>
              </div>
              <SegmentChart data={segmentData} />
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-sm font-semibold mb-4">Revenue (Last 90 Days)</h2>
              <RevenueChart data={revenueData} />
            </div>
          </div>

          {/* Churn Alerts */}
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

          {/* Recent Activity */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-sm font-semibold mb-4">Recent Activity</h2>

            {allActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {allActivity.map((item) => (
                  <li key={`${item.type}-${item.id}`} className="flex items-start gap-3 text-sm">
                    <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                      item.type === 'email'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {item.type === 'email' ? 'Email' : 'Order'}
                    </span>

                    <span className="flex-1 text-foreground">
                      {item.type === 'email'
                        ? `Sent "${item.subject ?? 'email'}" to ${item.customerName ?? 'customer'}`
                        : `Order ${item.totalPrice != null ? `$${new Decimal(item.totalPrice).toFixed(2)}` : ''} by ${item.customerName ?? 'customer'}`}
                    </span>

                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relativeTime(item.time)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
