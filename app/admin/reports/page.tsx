import { auth, clerkClient } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  getReportsCount,
  getReportsPage,
  resolveDisplayNames,
  REPORT_STATUS_TONE,
  type Report,
} from '../../lib/queries/admin-dashboard'
import DateRangeFilter from '../../ui/date-range-filter'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

const REASON_LABEL: Record<string, string> = {
  unsafe_driving_or_towing: 'Conducción o remolque inseguro',
  no_show_or_abandoned_trip: 'No se presentó o abandonó el viaje',
  inappropriate_behavior: 'Comportamiento inapropiado',
  vehicle_or_trip_mismatch: 'Vehículo o viaje no coincidente',
  other: 'Otro',
}

const DARK_STATUS_TONE: Record<string, string> = {
  unresolved: 'bg-rose-500/10 text-rose-300 ring-rose-500/20',
  considered: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
  dismissed: 'bg-muted text-muted-foreground ring-border',
  resolved: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
  in_review: 'bg-sky-500/10 text-sky-300 ring-sky-500/20',
}

export function getReasonLabel(reason: string): string {
  return REASON_LABEL[reason] ?? reason.replace(/_/g, ' ')
}

function getStatusTone(status: string): string {
  return (
    DARK_STATUS_TONE[status] ??
    REPORT_STATUS_TONE[status] ??
    'bg-muted text-muted-foreground ring-border'
  )
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== '',
  ) as [string, string][]
  return parts.length > 0 ? `?${new URLSearchParams(parts).toString()}` : ''
}

type PageProps = {
  searchParams: Promise<{ page?: string; from?: string; to?: string }>
}

export default async function AdminReportsPage({ searchParams }: PageProps) {
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

  const { page: pageParam, from, to } = await searchParams
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const offset = (currentPage - 1) * PAGE_SIZE

  const [totalCount, reports] = await Promise.all([
    getReportsCount(from, to),
    getReportsPage(currentPage, PAGE_SIZE, from, to),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const displayNames = await resolveDisplayNames(
    reports.flatMap((report) => [report.reporterClerkId, report.reportedClerkId]),
  )

  const firstItemIndex = totalCount === 0 ? 0 : offset + 1
  const lastItemIndex = Math.min(offset + reports.length, totalCount)

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
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-400">
            Admin
          </p>
          <h1 className="mt-2 text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.5px] leading-tight text-foreground">
            Reportes
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Listado completo de reportes registrados en el sistema.
          </p>
        </header>

        <DateRangeFilter basePath="/admin/reports" />

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Todos los reportes
            </h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {totalCount === 0
                ? 'Sin resultados'
                : `Mostrando ${firstItemIndex}–${lastItemIndex} de ${totalCount}`}
            </span>
          </div>

          {reports.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Aún no hay reportes registrados.
            </p>
          ) : (
            <ul className="px-6">
              {reports.map((report: Report) => {
                const reporterName =
                  displayNames[report.reporterClerkId] ?? report.reporterClerkId
                const reportedName =
                  displayNames[report.reportedClerkId] ?? report.reportedClerkId
                const statusTone = getStatusTone(report.status)

                return (
                  <li
                    key={report.id}
                    className="mt-2 mb-1 border-b border-border last:border-b-0"
                  >
                    <Link
                      href={`/admin/reports/${report.id}`}
                      className="flex flex-col gap-3 py-4 transition first:pt-0 last:pb-0 hover:bg-rose-500/[0.04] -mx-2 px-2 rounded-xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${statusTone}`}
                            >
                              {report.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-medium text-foreground">
                              {getReasonLabel(report.reason)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(report.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-foreground">
                            <span>{reporterName}</span>
                            <span className="px-1 text-muted-foreground">→</span>
                            <span>{reportedName}</span>
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/20">
                          Trip #{report.tripId}
                        </span>
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
                  href={`/admin/reports${qs({ page: String(safePage - 1), from, to })}`}
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
                  href={`/admin/reports${qs({ page: String(safePage + 1), from, to })}`}
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
