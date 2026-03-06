'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { TableIcon, BarChart3Icon } from 'lucide-react'

const SEGMENT_COLORS: Record<string, string> = {
  champion: '#22c55e',
  loyal: '#3b82f6',
  potential: '#a855f7',
  new: '#06b6d4',
  at_risk: '#f59e0b',
  hibernating: '#f97316',
  lost: '#ef4444',
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ')
}

interface SegmentChartProps {
  data: Array<{ segment: string; count: number }>
}

export function SegmentChart({ data }: SegmentChartProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    )
  }

  const total = data.reduce((sum, d) => sum + d.count, 0)

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
              <BarChart3Icon className="h-3.5 w-3.5" />
              Chart
            </>
          )}
        </button>
      </div>

      {viewMode === 'chart' ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="segment"
              tickFormatter={capitalize}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              formatter={(value: number | undefined) => [value ?? 0, 'Customers']}
              labelFormatter={(label: unknown) =>
                typeof label === 'string' ? capitalize(label) : String(label)
              }
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.segment}
                  fill={SEGMENT_COLORS[entry.segment] ?? '#94a3b8'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">Segment</th>
                <th className="text-right pb-2 pr-4 font-medium text-muted-foreground">Count</th>
                <th className="text-right pb-2 font-medium text-muted-foreground">%</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((entry) => (
                <tr key={entry.segment}>
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-sm shrink-0"
                        style={{ backgroundColor: SEGMENT_COLORS[entry.segment] ?? '#94a3b8' }}
                      />
                      {capitalize(entry.segment)}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">{entry.count}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {total > 0 ? ((entry.count / total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
