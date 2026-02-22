import { Skeleton } from '@/components/ui/skeleton'

export default function CustomersLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 min-w-[240px]" />
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {/* Header row */}
        <div className="border-b bg-muted/50 px-4 py-3 grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full max-w-[80px]" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b last:border-0 px-4 py-3 grid grid-cols-6 gap-4 items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-4 w-8 ml-auto" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
