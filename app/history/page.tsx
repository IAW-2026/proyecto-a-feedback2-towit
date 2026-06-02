import Link from 'next/link'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserPendingTrips, type UserTripRole } from '../lib/queries/trips'
import { resolveDisplayNames } from '../lib/queries/users'

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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7_0,_#fff7ed_28%,_#f8fafc_70%)] px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-3xl">
          <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
              Trip history
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              No trips to rate
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
              Your account doesn&apos;t have trips associated with it yet.
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
    role: role as UserTripRole,
    limit: PAGE_SIZE,
    offset,
  })

  const displayNames = await resolveDisplayNames(
    items.map((trip) => trip.counterpart_clerk_id),
  )

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const showEmptyState = items.length === 0

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7_0,_#fff7ed_28%,_#f8fafc_70%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
              Pending ratings
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Rate your recent trips
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              These trips don&apos;t have a rating from you yet. Share your
              feedback to help the community.
            </p>
          </div>
          <Link
            href="/ratings-history"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-amber-200 hover:text-amber-700"
          >
            View past ratings →
          </Link>
        </header>

        {showEmptyState ? (
          <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            <p className="text-lg font-semibold text-slate-900">
              You&apos;re all caught up!
            </p>
            <p className="mt-2 text-sm text-slate-600">
              No trips are waiting for your rating right now.
            </p>
            <Link
              href="/ratings-history"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              View past ratings
            </Link>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            <ul className="divide-y divide-slate-100">
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
                      <p className="text-sm font-semibold text-slate-900">
                        {trip.vehicle}
                      </p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        {roleLabel} {counterpartName}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {trip.date} · {trip.time}
                      </p>
                    </div>
                    <Link
                      href={`/rate/${trip.trip_id}`}
                      className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Rate trip
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
                className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 font-medium text-slate-700 transition hover:border-amber-200 hover:text-amber-700"
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
                className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 font-medium text-slate-700 transition hover:border-amber-200 hover:text-amber-700"
              >
                Next →
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
