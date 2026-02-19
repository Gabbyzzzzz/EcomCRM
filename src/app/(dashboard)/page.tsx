// Dashboard overview page — placeholder for Phase 3+ content
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome to EcomCRM. Your Shopify data will appear here after the first sync.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-sm">
        Customer segments, revenue trends, and automation performance will be displayed here.
      </div>
    </div>
  )
}
