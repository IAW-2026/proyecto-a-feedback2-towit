import { auth } from '@clerk/nextjs/server'
import postgres from 'postgres'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const databaseUrl = process.env.DATABASE_POSTGRES_URL

if (!databaseUrl) {
  throw new Error('DATABASE_POSTGRES_URL is not defined')
}

const sql = postgres(databaseUrl, { ssl: 'require' })

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
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
          History
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Trip History
        </h1>

        {trips.length === 0 ? (
          <p className="mt-10 text-center text-slate-500">
            No trips found.
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-slate-100">
            {trips.map((trip) => (
              <li
                key={trip.trip_id}
                className="py-4 first:pt-0 last:pb-0"
              >
                <Link
                  href={`/rate/${trip.trip_id}`}
                  className="flex w-full items-center justify-between text-inherit no-underline"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-slate-900">
                      Trip {trip.trip_id}
                    </span>
                    <span className="text-xs text-slate-500">
                      {trip.type === 'tower_to_customer' ? 'You towed' : 'You were towed'}
                      {' · '}
                      {new Date(trip.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">
                    {trip.rating} ★
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-between text-sm">
            {currentPage > 1 ? (
              <Link
                href={`/history?page=${currentPage - 1}`}
                className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}

            <span className="text-slate-500">
              Page {currentPage} of {totalPages}
            </span>

            {currentPage < totalPages ? (
              <Link
                href={`/history?page=${currentPage + 1}`}
                className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </div>
  )
}
