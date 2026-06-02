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

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

const REASON_LABEL: Record<string, string> = {
  unsafe_driving_or_towing: 'Unsafe driving or towing',
  no_show_or_abandoned_trip: 'No-show or abandoned trip',
  inappropriate_behavior: 'Inappropriate behavior',
  vehicle_or_trip_mismatch: 'Vehicle or trip mismatch',
  other: 'Other',
}

function getReasonLabel(reason: string): string {
  return REASON_LABEL[reason] ?? reason.replace(/_/g, ' ')
}

function getStatusTone(status: string): string {
  return REPORT_STATUS_TONE[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type PageProps = {
  searchParams: Promise<{ page?: string }>
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

  const { page: pageParam } = await searchParams
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const offset = (currentPage - 1) * PAGE_SIZE

  const [totalCount, reports] = await Promise.all([
    getReportsCount(),
    getReportsPage(currentPage, PAGE_SIZE),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const displayNames = await resolveDisplayNames(
    reports.flatMap((report) => [report.reporterClerkId, report.reportedClerkId]),
  )

  const firstItemIndex = totalCount === 0 ? 0 : offset + 1
  const lastItemIndex = Math.min(offset + reports.length, totalCount)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fee2e2_0,_#fff7ed_28%,_#f8fafc_70%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          ← Volver al dashboard
        </Link>

        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-700">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Reportes
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Listado completo de reportes registrados en el sistema.
          </p>
        </header>

        <section className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Todos los reportes
            </h2>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              {totalCount === 0
                ? 'Sin resultados'
                : `Mostrando ${firstItemIndex}–${lastItemIndex} de ${totalCount}`}
            </span>
          </div>

          {reports.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">
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
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <Link
                      href={`/admin/reports/${report.id}`}
                      className="flex flex-col gap-3 py-4 transition first:pt-0 last:pb-0 hover:bg-rose-50/40 -mx-2 px-2 rounded-xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${statusTone}`}
                            >
                              {report.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-medium text-slate-700">
                              {getReasonLabel(report.reason)}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatDateTime(report.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            <span>{reporterName}</span>
                            <span className="px-1 text-slate-400">→</span>
                            <span>{reportedName}</span>
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
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
            <nav className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 text-sm">
              {safePage > 1 ? (
                <Link
                  href={`/admin/reports?page=${safePage - 1}`}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  ← Anterior
                </Link>
              ) : (
                <span />
              )}

              <span className="text-slate-500">
                Página {safePage} de {totalPages}
              </span>

              {safePage < totalPages ? (
                <Link
                  href={`/admin/reports?page=${safePage + 1}`}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
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
