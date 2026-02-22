import { Skeleton } from '@/components/ui/skeleton'

export default function AutomationDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Back link skeleton */}
      <Skeleton className="h-4 w-36" />

      {/* Heading + badge skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Configuration card skeleton */}
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-6 w-32 mb-4" />

        {/* Read-only metadata grid (2 cols, 4 items) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Editable form area + preview skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form fields */}
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
            {/* Button row */}
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-28 ml-auto" />
            </div>
          </div>

          {/* Email preview */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24 mb-1" />
            <Skeleton className="h-64 w-full rounded-md" />
          </div>
        </div>
      </div>

      {/* AI Email Copy Generator card skeleton */}
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-6 w-44 mb-2" />
        <Skeleton className="h-4 w-80 mb-4" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-40" />
        </div>
      </div>
    </div>
  )
}
