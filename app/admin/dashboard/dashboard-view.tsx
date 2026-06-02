'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  DashboardSnapshot,
  Rating,
  Report,
  RatingType,
} from '../../lib/queries/admin-dashboard'

type PollStatus = 'idle' | 'fetching' | 'error'

const POLL_INTERVAL_MS = 60_000

const RATING_TYPE_LABEL: Record<RatingType, string> = {
  tower_to_customer: 'Tower → Customer',
  customer_to_tower: 'Customer → Tower',
}

const REASON_LABEL: Record<string, string> = {
  unsafe_driving_or_towing: 'Unsafe driving or towing',
  no_show_or_abandoned_trip: 'No-show or abandoned trip',
  inappropriate_behavior: 'Inappropriate behavior',
  vehicle_or_trip_mismatch: 'Vehicle or trip mismatch',
  other: 'Other',
}

const STATUS_TONE: Record<string, string> = {
  unresolved: 'bg-rose-50 text-rose-700 ring-rose-100',
  considered: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  dismissed: 'bg-slate-100 text-slate-700 ring-slate-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  pending: 'bg-amber-50 text-amber-700 ring-amber-100',
  in_review: 'bg-sky-50 text-sky-700 ring-sky-100',
}

function getStatusTone(status: string): string {
  return STATUS_TONE[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
}

function formatAverage(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return 'N/A'
  }
  return value.toFixed(2)
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatClockTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function getReasonLabel(reason: string): string {
  return REASON_LABEL[reason] ?? reason.replace(/_/g, ' ')
}

function isDashboardSnapshot(value: unknown): value is DashboardSnapshot {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Partial<DashboardSnapshot>

  return (
    typeof candidate.generatedAt === 'string' &&
    Array.isArray(candidate.latestRatings) &&
    Array.isArray(candidate.latestReports) &&
    !!candidate.stats &&
    !!candidate.displayNames
  )
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: 'amber' | 'rose' | 'sky' | 'emerald'
}) {
  const accentRing: Record<NonNullable<typeof accent>, string> = {
    amber: 'ring-amber-200/60',
    rose: 'ring-rose-200/60',
    sky: 'ring-sky-200/60',
    emerald: 'ring-emerald-200/60',
  }

  const ring = accent ? accentRing[accent] : 'ring-slate-200/60'

  return (
    <div
      className={`rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ${ring} backdrop-blur`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

function RatingRow({
  rating,
  displayNames,
}: {
  rating: Rating
  displayNames: Record<string, string>
}) {
  const raterName = displayNames[rating.raterClerkId] ?? rating.raterClerkId
  const ratedName = displayNames[rating.ratedClerkId] ?? rating.ratedClerkId

  return (
    <li className="border-b border-slate-100 last:border-b-0">
      <Link
        href={`/admin/ratings/${rating.id}`}
        className="flex flex-col gap-3 py-4 transition first:pt-0 last:pb-0 hover:bg-amber-50/40 -mx-2 px-2 rounded-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                {RATING_TYPE_LABEL[rating.type]}
              </span>
              <span className="text-xs text-slate-500">
                {formatDateTime(rating.createdAt)}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">
              <span>{raterName}</span>
              <span className="px-1 text-slate-400">→</span>
              <span>{ratedName}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-amber-500">
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              {rating.rating}
            </span>
            <span className="text-base">★</span>
          </div>
        </div>
      </Link>
    </li>
  )
}

function ReportRow({
  report,
  displayNames,
}: {
  report: Report
  displayNames: Record<string, string>
}) {
  const reporterName =
    displayNames[report.reporterClerkId] ?? report.reporterClerkId
  const reportedName =
    displayNames[report.reportedClerkId] ?? report.reportedClerkId

  return (
    <li className="border-b border-slate-100 last:border-b-0">
      <Link
        href={`/admin/reports/${report.id}`}
        className="flex flex-col gap-3 py-4 transition first:pt-0 last:pb-0 hover:bg-rose-50/40 -mx-2 px-2 rounded-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${getStatusTone(
                  report.status,
                )}`}
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
}

export function DashboardView({ initial }: { initial: DashboardSnapshot }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initial)
  const [pollStatus, setPollStatus] = useState<PollStatus>('idle')
  const [isPaused, setIsPaused] = useState(false)
  const inFlightRef = useRef<Promise<void> | null>(null)

  const refresh = useCallback(async () => {
    if (inFlightRef.current) {
      return inFlightRef.current
    }

    const task = (async () => {
      setPollStatus('fetching')

      try {
        const response = await fetch('/api/admin/dashboard', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`)
        }

        const data = (await response.json()) as unknown

        if (!isDashboardSnapshot(data)) {
          throw new Error('Invalid snapshot payload')
        }

        setSnapshot(data)
        setPollStatus('idle')
      } catch (error) {
        console.error('Failed to refresh admin dashboard', error)
        setPollStatus('error')
      } finally {
        inFlightRef.current = null
      }
    })()

    inFlightRef.current = task
    return task
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(typeof document !== 'undefined' && document.hidden)
    }

    handleVisibilityChange()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    void refresh()

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return
      }
      void refresh()
    }, POLL_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refresh])

  const statusText = useMemo(() => {
    if (isPaused) {
      return 'Pausado (tab oculta)'
    }
    switch (pollStatus) {
      case 'fetching':
        return 'Actualizando…'
      case 'error':
        return 'Reintentando…'
      case 'idle':
      default:
        return `Live`
    }
  }, [pollStatus, isPaused])

  const statusDotClass = useMemo(() => {
    if (isPaused) {
      return 'bg-slate-400'
    }
    switch (pollStatus) {
      case 'fetching':
        return 'bg-sky-500'
      case 'error':
        return 'bg-rose-500'
      case 'idle':
      default:
        return 'bg-emerald-500'
    }
  }, [pollStatus, isPaused])

  const { stats, latestRatings, latestReports, displayNames } = snapshot

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7_0,_#fff7ed_28%,_#f8fafc_70%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Feedback dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Resumen de la última semana y actividad reciente de
              calificaciones y reportes.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
            <span
              className={`relative inline-flex h-2.5 w-2.5 items-center justify-center rounded-full ${statusDotClass}`}
              aria-hidden
            >
              {pollStatus === 'fetching' ? (
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full ${statusDotClass} opacity-60`}
                />
              ) : null}
            </span>
            <span className="uppercase tracking-[0.18em]">{statusText}</span>
            <span className="text-slate-300">·</span>
            <span>Actualizado {formatClockTime(snapshot.generatedAt)}</span>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Calificaciones (7d)"
            value={stats.ratingsCount.toLocaleString()}
            accent="amber"
            hint="Última semana"
          />
          <StatCard
            label="Reportes (7d)"
            value={stats.reportsCount.toLocaleString()}
            accent="rose"
            hint="Última semana"
          />
          <StatCard
            label="Promedio recibido por Customers"
            value={formatAverage(stats.avgRatingToCustomers)}
            accent="sky"
            hint="Ratings tower_to_customer (7d)"
          />
          <StatCard
            label="Promedio recibido por Towers"
            value={formatAverage(stats.avgRatingToTowers)}
            accent="emerald"
            hint="Ratings customer_to_tower (7d)"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Últimas calificaciones
              </h2>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Top {latestRatings.length}
              </span>
            </div>
            {latestRatings.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">
                Aún no hay calificaciones registradas.
              </p>
            ) : (
              <ul className="mt-4">
                {latestRatings.map((rating) => (
                  <RatingRow
                    key={`rating-${rating.id}`}
                    rating={rating}
                    displayNames={displayNames}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Últimos reportes
              </h2>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Top {latestReports.length}
              </span>
            </div>
            {latestReports.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">
                No hay reportes registrados.
              </p>
            ) : (
              <ul className="mt-4">
                {latestReports.map((report) => (
                  <ReportRow
                    key={`report-${report.id}`}
                    report={report}
                    displayNames={displayNames}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
