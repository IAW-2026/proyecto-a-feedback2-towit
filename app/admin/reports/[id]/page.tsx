import { auth, clerkClient } from '@clerk/nextjs/server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  getReportDetailById,
  resolveDisplayNames,
  REPORT_STATUS_TONE,
  updateReportStatus,
  type EditableReportStatus,
} from '../../../lib/queries/admin-dashboard'

export const dynamic = 'force-dynamic'

const REASON_LABEL: Record<string, string> = {
  unsafe_driving_or_towing: 'Unsafe driving or towing',
  no_show_or_abandoned_trip: 'No-show or abandoned trip',
  inappropriate_behavior: 'Inappropriate behavior',
  vehicle_or_trip_mismatch: 'Vehicle or trip mismatch',
  other: 'Other',
}

const STATUS_LABEL: Record<EditableReportStatus, string> = {
  unresolved: 'Sin resolver',
  dismissed: 'Descartado',
  considered: 'Considerado',
}

const ALLOWED_STATUSES: ReadonlyArray<EditableReportStatus> = [
  'unresolved',
  'dismissed',
  'considered',
]

function getReasonLabel(reason: string): string {
  return REASON_LABEL[reason] ?? reason.replace(/_/g, ' ')
}

function getStatusTone(status: string): string {
  return REPORT_STATUS_TONE[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminReportDetailPage({ params }: PageProps) {
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
  const reportId = Number(id)

  if (!Number.isInteger(reportId) || reportId <= 0) {
    notFound()
  }

  const report = await getReportDetailById(reportId)

  if (!report) {
    notFound()
  }

  const displayNames = await resolveDisplayNames([
    report.reporterClerkId,
    report.reportedClerkId,
  ])

  const reporterName =
    displayNames[report.reporterClerkId] ?? report.reporterClerkId
  const reportedName =
    displayNames[report.reportedClerkId] ?? report.reportedClerkId

  const statusTone = getStatusTone(report.status)
  const isUnresolved = report.status === 'unresolved'

  async function changeStatus(formData: FormData) {
    'use server'

    const {
      isAuthenticated: isAuth,
      userId: actingUserId,
    } = await auth()

    if (!isAuth || !actingUserId) {
      redirect('/auth/sign-in')
    }

    const actingClient = await clerkClient()
    const actingUser = await actingClient.users
      .getUser(actingUserId)
      .catch(() => null)
    const actingRole = (actingUser?.publicMetadata as
      | { role?: string }
      | undefined)?.role

    if (actingRole !== 'admin-feedback') {
      redirect('/')
    }

    const target = formData.get('status')

    if (
      typeof target !== 'string' ||
      !ALLOWED_STATUSES.includes(target as EditableReportStatus)
    ) {
      throw new Error('Estado inválido')
    }

    await updateReportStatus(reportId, target as EditableReportStatus)

    revalidatePath(`/admin/reports/${reportId}`)
    revalidatePath('/admin/reports')
    revalidatePath('/admin/dashboard')
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fee2e2_0,_#fff7ed_28%,_#f8fafc_70%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          ← Volver a reportes
        </Link>

        <section className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-700">
                Reporte #{report.id}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {getReasonLabel(report.reason)}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {formatDateTime(report.createdAt)}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${statusTone}`}
            >
              {STATUS_LABEL[report.status as EditableReportStatus] ??
                report.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                Reportó
              </p>
              <Link
                href={`/profile/${report.reporterClerkId}`}
                className="mt-2 block text-lg font-semibold text-slate-900 hover:text-rose-700 hover:underline"
              >
                {reporterName}
              </Link>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                Reportado
              </p>
              <Link
                href={`/profile/${report.reportedClerkId}`}
                className="mt-2 block text-lg font-semibold text-slate-900 hover:text-rose-700 hover:underline"
              >
                {reportedName}
              </Link>
            </div>
          </div>

          {report.trip ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                  Viaje
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {report.trip.vehicle}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Trip #{report.tripId}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                  Fecha del viaje
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {report.trip.date} · {report.trip.time}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-500">
              Viaje no disponible (trip #{report.tripId}).
            </p>
          )}

          {report.description ? (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Descripción
              </p>
              <p className="mt-2 whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                {report.description}
              </p>
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Cambiar estado
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isUnresolved
              ? 'Marcá este reporte como descartado o como considerado.'
              : 'Volvé a abrir el reporte para que vuelva a estar sin resolver.'}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {isUnresolved ? (
              <>
                <form action={changeStatus}>
                  <input type="hidden" name="status" value="dismissed" />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Marcar como descartado
                  </button>
                </form>
                <form action={changeStatus}>
                  <input type="hidden" name="status" value="considered" />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Marcar como considerado
                  </button>
                </form>
              </>
            ) : (
              <form action={changeStatus}>
                <input type="hidden" name="status" value="unresolved" />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  Reabrir (volver a sin resolver)
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
