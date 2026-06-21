import Link from 'next/link'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserPendingTrips, type UserTripRole } from '../../lib/queries/trips'
import { resolveDisplayNames } from '../../lib/queries/users'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

type PageProps = {
  searchParams: Promise<{ page?: string }>
}

export default async function HistoryPage({ searchParams }: PageProps) {
  const { userId, isAuthenticated } = await auth()

  if (!isAuthenticated || !userId) {
    redirect('/auth/sign-in')
  }

  const clerk = await clerkClient()
  const currentUser = await clerk.users.getUser(userId).catch(() => null)
  const role = (currentUser?.publicMetadata as { role?: string } | undefined)
    ?.role

  if (role === 'admin-feedback') {
    redirect('/admin/dashboard')
  }

  if (role !== 'customer' && role !== 'tower') {
    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-3xl">
          <section className="overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-yellow">
              Historial de viajes
            </p>
            <h1 className="mt-3 text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.5px] leading-tight text-foreground">
              Sin viajes para calificar
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              Su cuenta no tiene viajes asociados aún.
            </p>
          </section>
        </div>
      </main>
    )
  }

  const { page: pageParam } = await searchParams
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const offset = (currentPage - 1) * PAGE_SIZE

  const { items, total } = await getUserPendingTrips({
    userId,
    limit: PAGE_SIZE,
    offset,
  })

  const displayNames = await resolveDisplayNames(
    items.map((trip) => trip.counterpart_clerk_id),
  )

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const showEmptyState = items.length === 0

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-yellow">
              Calificaciones pendientes
            </p>
            <h1 className="mt-2 text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.5px] leading-tight text-foreground">
              Califica tus viajes recientes
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Estos viajes aún no tienen una calificación de tu parte. Comparte tu
              feedback para ayudar a la comunidad.
            </p>
          </div>
          <Link
            href="/ratings-history"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:border-brand-yellow/40 hover:text-brand-yellow"
          >
            Ver historial →
          </Link>
        </header>

        {showEmptyState ? (
          <section className="overflow-hidden rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">
              ¡Estás al día!
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              No hay viajes esperando tu calificación en este momento.
            </p>
            <Link
              href="/ratings-history"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-yellow px-6 py-3 text-sm font-bold text-black transition hover:bg-brand-yellow-hover active:scale-95"
            >
              Ver historial de calificaciones
            </Link>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <ul className="divide-y divide-border">
              {items.map((trip) => {
                const counterpartName =
                  displayNames[trip.counterpart_clerk_id] ??
                  trip.counterpart_clerk_id
                const roleLabel =
                  trip.user_role_in_trip === 'customer'
                    ? 'Towed by'
                    : 'You towed'

                return (
                  <li
                    key={trip.trip_id}
                    className="flex flex-wrap items-center justify-between gap-4 px-6 py-5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {trip.vehicle}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {roleLabel} {counterpartName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {trip.date}
                      </p>
                    </div>
                    <Link
                      href={`/rate/${trip.trip_id}`}
                      className="inline-flex items-center justify-center rounded-lg bg-brand-yellow px-5 py-2.5 text-sm font-bold text-black transition hover:bg-brand-yellow-hover active:scale-95"
                    >
                      Calificar viaje
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {totalPages > 1 ? (
          <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
            {currentPage > 1 ? (
              <Link
                href={`/history?page=${currentPage - 1}`}
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
                href={`/history?page=${currentPage + 1}`}
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
