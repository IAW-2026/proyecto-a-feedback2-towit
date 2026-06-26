export default function HistoryLoading() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-3">
            <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
            <div className="h-9 w-72 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-96 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
        </header>

        {/* DateRangeFilter skeleton */}
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 w-24 animate-pulse rounded-lg bg-muted" />
        </div>

        {/* Trip list skeleton */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-5"
              >
                <div className="min-w-0 space-y-3">
                  <div className="h-4 w-44 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-56 animate-pulse rounded-full bg-muted/60" />
                  <div className="h-3 w-28 animate-pulse rounded-full bg-muted/40" />
                </div>
                <div className="h-10 w-36 animate-pulse rounded-lg bg-muted" />
              </li>
            ))}
          </ul>
        </section>

        {/* Pagination skeleton */}
        <nav className="flex flex-wrap items-center justify-between gap-3">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded-full bg-muted/60" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
        </nav>
      </div>
    </main>
  )
}
