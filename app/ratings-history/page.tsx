import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '../lib/db'

const PAGE_SIZE = 10

type RatingRow = {
  trip_id: string
  rating: number
  type: string
  created_at: string
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { userId, isAuthenticated } = await auth()

  if (!isAuthenticated || !userId) {
    redirect('/auth/sign-in')
  }

  const { page: pageParam } = await searchParams
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const offset = (currentPage - 1) * PAGE_SIZE

  const [countResult, trips] = await Promise.all([
    sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM ratings
      WHERE rater_clerk_id = ${userId}
    `,
    sql<RatingRow[]>`
      SELECT trip_id, rating, type, created_at
      FROM ratings
      WHERE rater_clerk_id = ${userId}
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

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {trips.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No has calificado ningún viaje aún.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {trips.map((trip) => (
                <li
                  key={trip.trip_id}
                  className="px-6 py-4 first:pt-6 last:pb-6"
                >
                  <Link
                    href={`/rate/${trip.trip_id}`}
                    className="flex w-full items-center justify-between text-inherit no-underline"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-foreground">
                        Trip {trip.trip_id}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {trip.type === 'tower_to_customer' ? 'Remolcaste' : 'Fue remolcado'}
                        {' · '}
                        {new Date(trip.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <span className="rounded-full border border-border bg-muted px-3 py-1 text-sm font-bold text-foreground">
                      {trip.rating} <span className="text-brand-yellow">★</span>
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
                href={`/ratings-history?page=${currentPage - 1}`}
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
                href={`/ratings-history?page=${currentPage + 1}`}
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
