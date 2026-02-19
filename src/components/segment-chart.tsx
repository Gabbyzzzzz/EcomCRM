'use client'

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

// Color map for each customer segment
const SEGMENT_COLORS: Record<string, string> = {
  champion: '#22c55e',
  loyal: '#3b82f6',
  potential: '#a855f7',
  new: '#06b6d4',
  at_risk: '#f59e0b',
  hibernating: '#f97316',
  lost: '#ef4444',
}

// Capitalize the first letter of each segment label for display
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ')
}

interface SegmentChartProps {
  data: Array<{ segment: string; count: number }>
}

export function SegmentChart({ data }: SegmentChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    )
  }

  return (
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
  )
}
