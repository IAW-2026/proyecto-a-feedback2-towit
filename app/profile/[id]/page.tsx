import { auth, clerkClient } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { sql } from '../../lib/db'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { isAuthenticated } = await auth()
  const { id } = await params

  if (!isAuthenticated) {
    redirect('/auth/sign-in')
  }

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(id).catch(() => null)

  if (!user) {
    notFound()
  }

  const historicalRatings = await sql<{ avg_rating: number | null }[]>`
    SELECT avg_rating::float8 AS avg_rating
    FROM average_ratings
    WHERE clerk_id = ${id}
    LIMIT 1
  `

  const last15Ratings = await sql<{ avg_rating: number | null }[]>`
    SELECT AVG(rating)::float8 AS avg_rating
    FROM (
      SELECT rating
      FROM ratings
      WHERE rated_clerk_id = ${id}
      ORDER BY created_at DESC
      LIMIT 15
    ) last_ratings
  `

  const displayName =
    user.fullName ?? user.username ?? [user.firstName, user.lastName].filter(Boolean).join(' ') ?? id
  const historicalAverage = historicalRatings[0]?.avg_rating
  const last15Average = last15Ratings[0]?.avg_rating

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
          Profile
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {displayName}
        </h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl bg-slate-50 p-6">
            <p className="text-sm font-medium text-slate-500">Historical average</p>
            <p className="mt-3 text-4xl font-semibold text-slate-900">
              {historicalAverage === null || historicalAverage === undefined
                ? 'N/A'
                : historicalAverage.toFixed(2)}
            </p>
          </section>

          <section className="rounded-2xl bg-slate-50 p-6">
            <p className="text-sm font-medium text-slate-500">Last 15 trips</p>
            <p className="mt-3 text-4xl font-semibold text-slate-900">
              {last15Average === null || last15Average === undefined
                ? 'N/A'
                : last15Average.toFixed(2)}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}