import { auth, clerkClient } from '@clerk/nextjs/server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  getRatingDetailById,
  resolveDisplayNames,
  type RatingType,
} from '../../../lib/queries/admin-dashboard'

export const dynamic = 'force-dynamic'

const RATING_TYPE_LABEL: Record<RatingType, string> = {
  tower_to_customer: 'Tower → Customer',
  customer_to_tower: 'Customer → Tower',
}

function getDisplayName(
  user: {
    fullName: string | null
    username: string | null
    firstName: string | null
    lastName: string | null
  } | null,
  fallback: string,
) {
  if (!user) {
    return fallback
  }

  return (
    user.fullName ??
    user.username ??
    [user.firstName, user.lastName].filter(Boolean).join(' ') ??
    fallback
  )
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminRatingDetailPage({ params }: PageProps) {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated || !userId) {
    redirect('/auth/sign-in')
  }

  const client = await clerkClient()
  const currentUser = await client.users.getUser(userId).catch(() => null)
  const role = (currentUser?.publicMetadata as { role?: string } | undefined)
    ?.role

  if (role !== 'admin-feedback') {
    redirect('/')
  }

  const { id } = await params
  const ratingId = Number(id)

  if (!Number.isInteger(ratingId) || ratingId <= 0) {
    notFound()
  }

  const rating = await getRatingDetailById(ratingId)

  if (!rating) {
    notFound()
  }

  const [raterUser, ratedUser] = await Promise.all([
    client.users.getUser(rating.raterClerkId).catch(() => null),
    client.users.getUser(rating.ratedClerkId).catch(() => null),
  ])

  const displayNames = await resolveDisplayNames([
    rating.raterClerkId,
    rating.ratedClerkId,
  ])

  const raterName =
    displayNames[rating.raterClerkId] ??
    getDisplayName(raterUser, rating.raterClerkId)
  const ratedName =
    displayNames[rating.ratedClerkId] ??
    getDisplayName(ratedUser, rating.ratedClerkId)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7_0,_#fff7ed_28%,_#f8fafc_70%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          ← Volver al dashboard
        </Link>

        <section className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
                Calificación #{rating.id}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {RATING_TYPE_LABEL[rating.type]}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {formatDateTime(rating.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-amber-50 px-5 py-2 text-amber-700 ring-1 ring-amber-100">
              <span className="text-3xl font-semibold tracking-tight text-slate-900">
                {rating.rating}
              </span>
              <span className="text-2xl">★</span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                Calificó
              </p>
              <Link
                href={`/profile/${rating.raterClerkId}`}
                className="mt-2 block text-lg font-semibold text-slate-900 hover:text-amber-700 hover:underline"
              >
                {raterName}
              </Link>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                Calificado
              </p>
              <Link
                href={`/profile/${rating.ratedClerkId}`}
                className="mt-2 block text-lg font-semibold text-slate-900 hover:text-amber-700 hover:underline"
              >
                {ratedName}
              </Link>
            </div>
          </div>

          {rating.trip ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                  Viaje
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {rating.trip.vehicle}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Trip #{rating.tripId}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                  Fecha del viaje
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {rating.trip.date} · {rating.trip.time}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-500">
              Viaje no disponible (trip #{rating.tripId}).
            </p>
          )}

          {rating.tags ? (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Tag
              </p>
              <p className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 ring-1 ring-amber-100">
                {rating.tags.replace(/_/g, ' ')}
              </p>
            </div>
          ) : null}

          {rating.comment ? (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Comentario
              </p>
              <p className="mt-2 whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                {rating.comment}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
