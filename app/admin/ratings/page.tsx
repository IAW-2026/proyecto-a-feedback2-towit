import { auth, clerkClient } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  getRatingsCount,
  getRatingsPage,
  resolveDisplayNames,
  type Rating,
  type RatingType,
} from '../../lib/queries/admin-dashboard'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

const RATING_TYPE_LABEL: Record<RatingType, string> = {
  tower_to_customer: 'Tower → Customer',
  customer_to_tower: 'Customer → Tower',
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type PageProps = {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminRatingsPage({ searchParams }: PageProps) {
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

  const { page: pageParam } = await searchParams
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const offset = (currentPage - 1) * PAGE_SIZE

  const [totalCount, ratings] = await Promise.all([
    getRatingsCount(),
    getRatingsPage(currentPage, PAGE_SIZE),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const displayNames = await resolveDisplayNames(
    ratings.flatMap((rating) => [rating.raterClerkId, rating.ratedClerkId]),
  )

  const firstItemIndex = totalCount === 0 ? 0 : offset + 1
  const lastItemIndex = Math.min(offset + ratings.length, totalCount)

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← Volver al dashboard
        </Link>

        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-yellow">
            Admin
          </p>
          <h1 className="mt-2 text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.5px] leading-tight text-foreground">
            Calificaciones
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Listado completo de calificaciones registradas en el sistema.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Todas las calificaciones
            </h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {totalCount === 0
                ? 'Sin resultados'
                : `Mostrando ${firstItemIndex}–${lastItemIndex} de ${totalCount}`}
            </span>
          </div>

          {ratings.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Aún no hay calificaciones registradas.
            </p>
          ) : (
            <ul className="px-6">
              {ratings.map((rating: Rating) => {
                const raterName =
                  displayNames[rating.raterClerkId] ?? rating.raterClerkId
                const ratedName =
                  displayNames[rating.ratedClerkId] ?? rating.ratedClerkId

                return (
                  <li
                    key={rating.id}
                    className="mt-2 mb-1 border-b border-border last:border-b-0"
                  >
                    <Link
                      href={`/admin/ratings/${rating.id}`}
                      className="flex flex-col gap-3 py-4 transition first:pt-0 last:pb-0 hover:bg-brand-yellow/[0.04] -mx-2 px-2 rounded-xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="rounded-full bg-brand-yellow/10 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow ring-1 ring-brand-yellow/20">
                              {RATING_TYPE_LABEL[rating.type]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(rating.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-foreground">
                            <span>{raterName}</span>
                            <span className="px-1 text-muted-foreground">→</span>
                            <span>{ratedName}</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="text-lg font-semibold tracking-tight text-foreground">
                            {rating.rating}
                          </span>
                          <span className="text-base text-brand-yellow">★</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          {totalPages > 1 ? (
            <nav className="flex items-center justify-between gap-3 border-t border-border px-6 py-4 text-sm">
              {safePage > 1 ? (
                <Link
                  href={`/admin/ratings?page=${safePage - 1}`}
                  className="rounded-lg border border-border bg-muted px-4 py-2 font-medium text-foreground transition hover:bg-card"
                >
                  ← Anterior
                </Link>
              ) : (
                <span />
              )}

              <span className="text-muted-foreground">
                Página {safePage} de {totalPages}
              </span>

              {safePage < totalPages ? (
                <Link
                  href={`/admin/ratings?page=${safePage + 1}`}
                  className="rounded-lg border border-border bg-muted px-4 py-2 font-medium text-foreground transition hover:bg-card"
                >
                  Siguiente →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>
      </div>
    </main>
  )
}
