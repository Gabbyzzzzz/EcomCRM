'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────────────────────────────

type CustomerSegment =
  | 'champion'
  | 'loyal'
  | 'potential'
  | 'new'
  | 'at_risk'
  | 'hibernating'
  | 'lost'

interface CustomerRow {
  id: string
  name: string | null
  email: string | null
  segment: CustomerSegment | null
  totalSpent: string | null
  orderCount: number | null
  avgOrderValue: string | null
  lastOrderAt: string | null
  tags: string[] | null
  rfmR: number | null
  rfmF: number | null
  rfmM: number | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface CustomerData {
  customers: CustomerRow[]
  pagination: Pagination
}

interface CustomerFiltersProps {
  initialData: CustomerData
}

// ─── Segment colors ────────────────────────────────────────────────────────────

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

// ─── Helper formatters ─────────────────────────────────────────────────────────

function formatCurrency(value: string | null): string {
  if (value == null) return '—'
  return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatDate(value: string | Date | null): string {
  if (value == null) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── CustomerFilters — Client Component ────────────────────────────────────────

export function CustomerFilters({ initialData }: CustomerFiltersProps) {
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<CustomerData>(initialData)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef(search)

  // Fetch data from the API
  const fetchData = async (s: string, seg: string, p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' })
      if (s) params.set('search', s)
      if (seg) params.set('segment', seg)
      const res = await fetch(`/api/customers?${params.toString()}`)
      if (!res.ok) return
      const json = (await res.json()) as CustomerData
      setData(json)
    } catch {
      // non-fatal fetch error — keep previous data visible
    } finally {
      setLoading(false)
    }
  }

  // When page changes (not triggered by search/segment), fetch immediately
  useEffect(() => {
    fetchData(searchRef.current, segment, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // When segment changes, reset page to 1 and fetch
  const handleSegmentChange = (newSegment: string) => {
    setSegment(newSegment)
    setPage(1)
    fetchData(searchRef.current, newSegment, 1)
  }

  // When search changes, debounce 300ms, reset page to 1
  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch)
    searchRef.current = newSearch
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchData(newSearch, segment, 1)
    }, 300)
  }

  const { customers: rows, pagination } = data
  const startRow = (pagination.page - 1) * pagination.limit + 1
  const endRow = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="flex flex-col gap-4">
      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name or email..."
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[240px] flex-1"
        />
        <select
          value={segment}
          onChange={(e) => handleSegmentChange(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Segments</option>
          <option value="champion">Champion</option>
          <option value="loyal">Loyal</option>
          <option value="potential">Potential</option>
          <option value="new">New</option>
          <option value="at_risk">At Risk</option>
          <option value="hibernating">Hibernating</option>
          <option value="lost">Lost</option>
        </select>
        {loading && (
          <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>
        )}
      </div>

      {/* ── Customer table ───────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center">
            {search || segment ? (
              <>
                <p className="text-sm font-medium mb-1">No customers match your filters.</p>
                <p className="text-xs text-muted-foreground">
                  Try clearing the search or segment filter.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium mb-1">No customers found.</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Import your Shopify customers to get started.
                </p>
                <a
                  href="/settings/sync"
                  className="text-xs text-primary hover:underline"
                >
                  Go to Sync Settings &rarr;
                </a>
              </>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Segment</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Spent</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Orders</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((customer) => (
                <tr key={customer.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="font-medium hover:underline text-foreground"
                    >
                      {customer.name ?? '(no name)'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {customer.email ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {customer.segment ? (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SEGMENT_COLORS[customer.segment]}`}
                      >
                        {SEGMENT_LABELS[customer.segment]}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(customer.totalSpent)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {customer.orderCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDate(customer.lastOrderAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination controls ──────────────────────────────────────── */}
      {pagination.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {startRow}–{endRow} of {pagination.total} customers
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-muted-foreground px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
