import { Skeleton } from '@/components/ui/skeleton'

export default function AutomationsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {/* Table header row */}
        <div className="border-b bg-muted/50 grid grid-cols-7 gap-4 px-4 py-3">
          {['Flow Name', 'Trigger', 'Delay', 'Action', 'Status', 'Last Run', 'Toggle'].map((col) => (
            <Skeleton key={col} className="h-3 w-full max-w-[72px]" />
          ))}
        </div>

        {/* Table data rows — 5 rows for 5 preset automations */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-7 gap-4 px-4 py-3 border-b last:border-0 items-center"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-10 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
