import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Heading skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* KPI cards skeleton — 4 cards in a responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 flex flex-col gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>

      {/* Charts skeleton — 2 side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <Skeleton className="h-4 w-36 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>

      {/* Churn alerts skeleton */}
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-4 w-28 mb-4" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full max-w-xs" />
          ))}
        </div>
      </div>

      {/* Recent activity skeleton */}
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
