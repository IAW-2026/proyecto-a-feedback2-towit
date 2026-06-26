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
import { getReasonLabel } from '../page'

export const dynamic = 'force-dynamic'



export const STATUS_LABEL: Record<EditableReportStatus, string> = {
  unresolved: 'Sin resolver',
  dismissed: 'Descartado',
  considered: 'Considerado',
}

const ALLOWED_STATUSES: ReadonlyArray<EditableReportStatus> = [
  'unresolved',
  'dismissed',
  'considered',
]

const DARK_STATUS_TONE: Record<string, string> = {
  unresolved: 'bg-rose-500/10 text-rose-300 ring-rose-500/20',
  considered: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
  dismissed: 'bg-muted text-muted-foreground ring-border',
  resolved: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
  in_review: 'bg-sky-500/10 text-sky-300 ring-sky-500/20',
}

function getStatusTone(status: string): string {
  return (
    DARK_STATUS_TONE[status] ??
    REPORT_STATUS_TONE[status] ??
    'bg-muted text-muted-foreground ring-border'
  )
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
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← Volver a reportes
        </Link>

        <section className="overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-400">
                Reporte #{report.id}
              </p>
              <h1 className="mt-3 text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.5px] leading-tight text-foreground">
                {getReasonLabel(report.reason)}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
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
            <div className="rounded-2xl bg-muted p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Reportó
              </p>
              <Link
                href={`/profile/${report.reporterClerkId}`}
                className="mt-2 block text-lg font-bold text-foreground hover:text-rose-400 hover:underline"
              >
                {reporterName}
              </Link>
            </div>
            <div className="rounded-2xl bg-muted p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Reportado
              </p>
              <Link
                href={`/profile/${report.reportedClerkId}`}
                className="mt-2 block text-lg font-bold text-foreground hover:text-rose-400 hover:underline"
              >
                {reportedName}
              </Link>
            </div>
          </div>

          {report.trip ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Viaje
                </p>
                <p className="mt-2 text-lg font-bold text-foreground">
                  {report.trip.vehicle}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Trip #{report.tripId}
                </p>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Fecha del viaje
                </p>
                <p className="mt-2 text-lg font-bold text-foreground">
                  {report.trip.date}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Viaje no disponible (trip #{report.tripId}).
            </p>
          )}

          {report.description ? (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Descripción
              </p>
              <p className="mt-2 whitespace-pre-line rounded-2xl bg-muted p-4 text-sm leading-6 text-foreground">
                {report.description}
              </p>
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Cambiar estado
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
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
                    className="inline-flex items-center justify-center rounded-lg border-2 border-border bg-muted px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-card active:scale-95"
                  >
                    Marcar como descartado
                  </button>
                </form>
                <form action={changeStatus}>
                  <input type="hidden" name="status" value="considered" />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-500/20 px-5 py-2.5 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/30 active:scale-95"
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
                  className="inline-flex items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
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
