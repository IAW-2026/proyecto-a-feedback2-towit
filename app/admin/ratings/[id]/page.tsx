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
    console.log("rating not found")
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
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← Volver al dashboard
        </Link>

        <section className="overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-yellow">
                Calificación #{rating.id}
              </p>
              <h1 className="mt-3 text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.5px] leading-tight text-foreground">
                {RATING_TYPE_LABEL[rating.type]}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatDateTime(rating.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-brand-yellow/30 bg-brand-yellow/10 px-5 py-2 text-brand-yellow">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {rating.rating}
              </span>
              <span className="text-2xl text-brand-yellow">★</span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-muted p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Calificó
              </p>
              <Link
                href={`/profile/${rating.raterClerkId}`}
                className="mt-2 block text-lg font-bold text-foreground hover:text-brand-yellow hover:underline"
              >
                {raterName}
              </Link>
            </div>
            <div className="rounded-2xl bg-muted p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Calificado
              </p>
              <Link
                href={`/profile/${rating.ratedClerkId}`}
                className="mt-2 block text-lg font-bold text-foreground hover:text-brand-yellow hover:underline"
              >
                {ratedName}
              </Link>
            </div>
          </div>

          {rating.trip ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Viaje
                </p>
                <p className="mt-2 text-lg font-bold text-foreground">
                  {rating.trip.vehicle}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Trip #{rating.tripId}
                </p>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Fecha del viaje
                </p>
                <p className="mt-2 text-lg font-bold text-foreground">
                  {rating.trip.date} · {rating.trip.time}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Viaje no disponible (trip #{rating.tripId}).
            </p>
          )}

          {rating.tags ? (
            <div className="mt-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Tag
              </p>
              <p className="mt-2 inline-flex rounded-full bg-brand-yellow/10 px-3 py-1 text-sm font-semibold text-brand-yellow ring-1 ring-brand-yellow/20">
                {rating.tags.replace(/_/g, ' ')}
              </p>
            </div>
          ) : null}

          {rating.comment ? (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Comentario
              </p>
              <p className="mt-2 whitespace-pre-line rounded-2xl bg-muted p-4 text-sm leading-6 text-foreground">
                {rating.comment}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
