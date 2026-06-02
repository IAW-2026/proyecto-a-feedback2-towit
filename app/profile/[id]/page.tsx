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
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-yellow">
            Perfil de usuario
          </p>
          <h1 className="mt-3 text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.5px] leading-tight text-foreground">
            {displayName}
          </h1>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl bg-muted p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Promedio histórico de calificaciones
              </p>
              <p className="mt-3 text-4xl font-extrabold tracking-tight text-foreground">
                {historicalAverage === null || historicalAverage === undefined
                  ? 'N/A'
                  : historicalAverage.toFixed(2)}
              </p>
            </section>

            <section className="rounded-2xl bg-muted p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Últimas 15 calificaciones
              </p>
              <p className="mt-3 text-4xl font-extrabold tracking-tight text-foreground">
                {last15Average === null || last15Average === undefined
                  ? 'N/A'
                  : last15Average.toFixed(2)}
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
