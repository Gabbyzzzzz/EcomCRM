import { notFound } from 'next/navigation'
import Link from 'next/link'
import { env } from '@/lib/env'
import { getCustomerProfile, getCustomerOrders, getCustomerMessages } from '@/lib/db/queries'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata() {
  return { title: 'Customer Profile | EcomCRM' }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type CustomerSegment =
  | 'champion'
  | 'loyal'
  | 'potential'
  | 'new'
  | 'at_risk'
  | 'hibernating'
  | 'lost'

// ─── Segment colors + labels ──────────────────────────────────────────────────

const SEGMENT_COLORS: Record<CustomerSegment, string> = {
  champion: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  loyal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  potential: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  new: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  at_risk: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  hibernating: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  champion: 'Champion',
  loyal: 'Loyal',
  potential: 'Potential',
  new: 'New',
  at_risk: 'At Risk',
  hibernating: 'Hibernating',
  lost: 'Lost',
}

// ─── Financial status badge colors ────────────────────────────────────────────

const FINANCIAL_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  authorized: 'bg-blue-100 text-blue-700',
  refunded: 'bg-red-100 text-red-700',
  voided: 'bg-gray-100 text-gray-500',
}

// ─── Message status badge colors ──────────────────────────────────────────────

const MESSAGE_STATUS_COLORS: Record<string, string> = {
  sent: 'bg-blue-100 text-blue-700',
  opened: 'bg-green-100 text-green-700',
  clicked: 'bg-green-100 text-green-700',
  converted: 'bg-green-100 text-green-700',
  suppressed: 'bg-gray-100 text-gray-500',
  failed: 'bg-red-100 text-red-700',
}

// ─── Formatting helpers ────────────────────────────────────────────────────────

function formatCurrency(value: string | null): string {
  if (value == null) return '$0.00'
  return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatDate(date: Date | null): string {
  if (date == null) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(date: Date | null): string {
  if (date == null) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── RFM Score Bar ─────────────────────────────────────────────────────────────

function RfmScoreBar({ label, score }: { label: string; score: number | null }) {
  if (score == null) {
    return (
      <div className="flex items-center gap-3">
        <span className="w-16 text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">Not scored</span>
      </div>
    )
  }

  const widthClasses = ['w-1/5', 'w-2/5', 'w-3/5', 'w-4/5', 'w-full']
  const widthClass = widthClasses[Math.min(score - 1, 4)] ?? 'w-0'

  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-sm font-medium">{label}: {score}/5</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full bg-primary ${widthClass}`} />
      </div>
    </div>
  )
}

// ─── CustomerProfilePage — Server Component ───────────────────────────────────

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const shopId = new URL(env.SHOPIFY_STORE_URL).hostname

  const [customer, customerOrders, customerMessages] = await Promise.all([
    getCustomerProfile(shopId, id),
    getCustomerOrders(shopId, id),
    getCustomerMessages(shopId, id),
  ])

  if (!customer) {
    notFound()
  }

  const segment = customer.segment as CustomerSegment | null

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Link
          href="/customers"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 w-fit"
        >
          &larr; Back to Customers
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold tracking-tight">
            {customer.name ?? 'Unknown Customer'}
          </h1>
          {segment && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${SEGMENT_COLORS[segment]}`}
            >
              {SEGMENT_LABELS[segment]}
            </span>
          )}
        </div>
      </div>

      {/* ── Info Cards Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Card 1: Customer Info */}
        <div className="rounded-lg border bg-card p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Customer Info</h2>
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="text-xs text-muted-foreground mb-0.5">Email</dt>
              <dd className="text-sm">{customer.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-0.5">Phone</dt>
              <dd className="text-sm">{customer.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-0.5">Lifecycle Stage</dt>
              <dd className="text-sm capitalize">{customer.lifecycleStage ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-0.5">Customer Since</dt>
              <dd className="text-sm">{formatDate(customer.createdAt)}</dd>
            </div>
          </dl>
        </div>

        {/* Card 2: RFM Scores */}
        <div className="rounded-lg border bg-card p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">RFM Scores</h2>
          {customer.rfmR == null && customer.rfmF == null && customer.rfmM == null ? (
            <p className="text-sm text-muted-foreground">Not scored yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              <RfmScoreBar label="R (Recency)" score={customer.rfmR} />
              <RfmScoreBar label="F (Frequency)" score={customer.rfmF} />
              <RfmScoreBar label="M (Monetary)" score={customer.rfmM} />
            </div>
          )}
          {segment && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Segment</p>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${SEGMENT_COLORS[segment]}`}
              >
                {SEGMENT_LABELS[segment]}
              </span>
            </div>
          )}
        </div>

        {/* Card 3: Financials */}
        <div className="rounded-lg border bg-card p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Financials</h2>
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="text-xs text-muted-foreground mb-0.5">Total Spent</dt>
              <dd className="text-sm font-medium tabular-nums">{formatCurrency(customer.totalSpent)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-0.5">Order Count</dt>
              <dd className="text-sm tabular-nums">{customer.orderCount ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-0.5">Avg Order Value</dt>
              <dd className="text-sm tabular-nums">{formatCurrency(customer.avgOrderValue)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-0.5">First Order</dt>
              <dd className="text-sm">{formatDate(customer.firstOrderAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-0.5">Last Order</dt>
              <dd className="text-sm">{formatDate(customer.lastOrderAt)}</dd>
            </div>
          </dl>
        </div>

      </div>

      {/* ── Tags Section ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Shopify Tags</h2>
        {customer.tags && customer.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {customer.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-3 py-1 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tags</p>
        )}
      </div>

      {/* ── Order Timeline ───────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Order History</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {customerOrders.length} {customerOrders.length === 1 ? 'order' : 'orders'}
          </span>
        </div>
        {customerOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">Order ID</th>
                  <th className="text-right pb-2 pr-4 font-medium text-muted-foreground">Total</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customerOrders.map((order) => {
                  const status = order.financialStatus ?? 'unknown'
                  const statusColor = FINANCIAL_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'
                  // Truncate Shopify GID to last 16 chars for display
                  const displayId = order.shopifyId.length > 16
                    ? '...' + order.shopifyId.slice(-16)
                    : order.shopifyId
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        {formatDate(order.shopifyCreatedAt)}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                        {displayId}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {formatCurrency(order.totalPrice)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Message History ──────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Message History</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {customerMessages.length} {customerMessages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>
        {customerMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages sent yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">Subject</th>
                  <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">Automation</th>
                  <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">Opened</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">Clicked</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customerMessages.map((msg) => {
                  const statusColor = MESSAGE_STATUS_COLORS[msg.status] ?? 'bg-gray-100 text-gray-500'
                  return (
                    <tr key={msg.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {formatDateTime(msg.sentAt)}
                      </td>
                      <td className="py-3 pr-4 max-w-[200px] truncate">
                        {msg.subject ?? '—'}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground text-xs">
                        {msg.automationName ?? '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}
                        >
                          {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {msg.openedAt ? (
                          <span className="text-green-600">Yes — {formatDate(msg.openedAt)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 text-xs">
                        {msg.clickedAt ? (
                          <span className="text-green-600">Yes — {formatDate(msg.clickedAt)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
