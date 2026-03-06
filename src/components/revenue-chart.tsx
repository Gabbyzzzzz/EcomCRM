'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { TableIcon, LineChartIcon } from 'lucide-react'

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  return `${parts[1]}/${parts[2]}`
}

function formatRevenue(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '$0'
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`
  return `$${num.toFixed(2)}`
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number | string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{formatRevenue(payload[0].value)}</p>
    </div>
  )
}

interface RevenueChartProps {
  data: Array<{ date: string; revenue: string }>
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    )
  }

  const chartData = data.map((d) => ({
    date: d.date,
    revenue: parseFloat(d.revenue),
  }))

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label={viewMode === 'chart' ? 'View as table' : 'View as chart'}
        >
          {viewMode === 'chart' ? (
            <>
              <TableIcon className="h-3.5 w-3.5" />
              Table
            </>
          ) : (
            <>
              <LineChartIcon className="h-3.5 w-3.5" />
              Chart
            </>
          )}
        </button>
      </div>

      {viewMode === 'chart' ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatRevenue}
              tick={{ fontSize: 12 }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="max-h-[300px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b">
                <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">Date</th>
                <th className="text-right pb-2 font-medium text-muted-foreground">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {chartData.map((entry) => (
                <tr key={entry.date}>
                  <td className="py-1.5 pr-4">{entry.date}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatRevenue(entry.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
