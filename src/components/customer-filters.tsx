'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { SearchIcon, ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

// Types

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

// Segment colors

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

// Formatters

function formatCurrency(value: string | null): string {
  if (value == null) return '--'
  return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatDate(value: string | Date | null): string {
  if (value == null) return '--'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Sortable column header

type SortKey = 'name' | 'totalSpent' | 'orderCount' | 'lastOrderAt'
type SortDir = 'asc' | 'desc'

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: SortKey
  currentSort: SortKey | null
  currentDir: SortDir
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = currentSort === sortKey
  return (
    <th
      className={`${align === 'right' ? 'text-right' : 'text-left'} px-4 py-3 font-medium text-muted-foreground`}
    >
      <button
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {active ? (
          currentDir === 'asc' ? (
            <ChevronUpIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDownIcon className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  )
}

// Loading skeleton for the table
function TableSkeleton() {
  return (
    <div className="p-4 flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-20 ml-auto" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

// Main component

export function CustomerFilters({ initialData }: CustomerFiltersProps) {
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<CustomerData>(initialData)
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef(search)

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
      // non-fatal fetch error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(searchRef.current, segment, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleSegmentChange = (newSegment: string) => {
    setSegment(newSegment)
    setPage(1)
    fetchData(searchRef.current, newSegment, 1)
  }

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch)
    searchRef.current = newSearch
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchData(newSearch, segment, 1)
    }, 300)
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  // Client-side sort
  const sortedRows = (() => {
    const rows = [...data.customers]
    if (!sortKey) return rows
    return rows.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = (a.name ?? '').localeCompare(b.name ?? '')
          break
        case 'totalSpent':
          cmp = Number(a.totalSpent ?? 0) - Number(b.totalSpent ?? 0)
          break
        case 'orderCount':
          cmp = (a.orderCount ?? 0) - (b.orderCount ?? 0)
          break
        case 'lastOrderAt':
          cmp = new Date(a.lastOrderAt ?? 0).getTime() - new Date(b.lastOrderAt ?? 0).getTime()
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  })()

  const { pagination } = data
  const startRow = (pagination.page - 1) * pagination.limit + 1
  const endRow = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
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
      </div>

      {/* Customer table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : sortedRows.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            {search || segment ? (
              <>
                <p className="text-sm font-medium mb-1">No customers match your filters.</p>
                <p className="text-xs text-muted-foreground">
                  Try clearing the search or segment filter.
                </p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-muted p-4 mb-4">
                  <svg className="h-8 w-8 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <p className="text-sm font-medium mb-1">No customers found</p>
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
                <SortHeader label="Name" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Segment</th>
                <SortHeader label="Total Spent" sortKey="totalSpent" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Orders" sortKey="orderCount" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Last Order" sortKey="lastOrderAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedRows.map((customer) => (
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
                    {customer.email ?? '--'}
                  </td>
                  <td className="px-4 py-3">
                    {customer.segment ? (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SEGMENT_COLORS[customer.segment]}`}
                      >
                        {SEGMENT_LABELS[customer.segment]}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">--</span>
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

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {startRow}--{endRow} of {pagination.total} customers
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
