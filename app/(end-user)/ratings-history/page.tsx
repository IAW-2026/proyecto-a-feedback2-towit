import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '../../lib/db'
import DateRangeFilter from '../../ui/date-range-filter'

const PAGE_SIZE = 10

type RatingRow = {
  trip_id: string
  rating: number
  type: string
  created_at: string
}

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== '',
  ) as [string, string][]
  return parts.length > 0 ? `?${new URLSearchParams(parts).toString()}` : ''
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; from?: string; to?: string }>
}) {
  const { userId, isAuthenticated } = await auth()

  if (!isAuthenticated || !userId) {
    redirect('/auth/sign-in')
  }

  const { page: pageParam, from, to } = await searchParams
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const offset = (currentPage - 1) * PAGE_SIZE

  const baseCondition = sql`rater_clerk_id = ${userId}`
  const dateClauses: ReturnType<typeof sql>[] = []
  if (from) dateClauses.push(sql`created_at >= ${from}::timestamptz`)
  if (to) dateClauses.push(sql`created_at < ${to}::timestamptz + interval '1 day'`)
  const allConditions =
    dateClauses.length > 0
      ? sql`${baseCondition} AND ${dateClauses.reduce((acc, f) => sql`${acc} AND ${f}`)}`
      : baseCondition

  const [countResult, ratings] = await Promise.all([
    sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM ratings
      WHERE ${allConditions}
    `,
    sql<RatingRow[]>`
      SELECT trip_id, rating, type, created_at
      FROM ratings
      WHERE ${allConditions}
      ORDER BY created_at DESC
      LIMIT ${PAGE_SIZE}
      OFFSET ${offset}
    `,
  ])

  const totalCount = countResult[0]?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-yellow">
            Historial de calificaciones
          </p>
          <h1 className="mt-2 text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.5px] leading-tight text-foreground">
            Calificaciones recientes
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Todas las calificaciones que enviaste.
          </p>
        </header>

        <DateRangeFilter basePath="/ratings-history" />

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {ratings.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No has calificado ningún viaje aún.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {ratings.map((rating) => (
                <li
                  key={rating.trip_id}
                  className="px-6 py-4 first:pt-6 last:pb-6"
                >
                  <Link
                    href={`/rate/${rating.trip_id}`}
                    className="flex w-full items-center justify-between text-inherit no-underline"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-foreground">
                        Trip {rating.trip_id}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {'Calificado el '}
                        {new Date(rating.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <span className="rounded-full border border-border bg-muted px-3 py-1 text-sm font-bold text-foreground">
                      {rating.rating} <span className="text-brand-yellow">★</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {totalPages > 1 ? (
          <nav className="flex items-center justify-between text-sm">
            {currentPage > 1 ? (
              <Link
                href={`/ratings-history${qs({ page: String(currentPage - 1), from, to })}`}
                className="rounded-lg border border-border bg-card px-4 py-2 font-medium text-foreground transition hover:border-brand-yellow/40 hover:text-brand-yellow"
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}

            <span className="text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>

            {currentPage < totalPages ? (
              <Link
                href={`/ratings-history${qs({ page: String(currentPage + 1), from, to })}`}
                className="rounded-lg border border-border bg-card px-4 py-2 font-medium text-foreground transition hover:border-brand-yellow/40 hover:text-brand-yellow"
              >
                Siguiente →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </main>
  )
}
