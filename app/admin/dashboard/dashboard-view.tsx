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

export const REASON_LABEL: Record<string, string> = {
  unsafe_driving_or_towing: 'Conducción o remolque inseguro',
  no_show_or_abandoned_trip: 'No se presentó o abandonó el viaje',
  inappropriate_behavior: 'Comportamiento inapropiado',
  vehicle_or_trip_mismatch: 'Vehículo o viaje no coincidente',
  other: 'Otro',
}

export const STATUS_LABEL: Record<string, string> = {
  unresolved: 'Sin resolver',
  dismissed: 'Descartado',
  considered: 'Considerado',
}

const STATUS_TONE: Record<string, string> = {
  unresolved: 'bg-rose-500/10 text-rose-300 ring-rose-500/20',
  considered: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
  dismissed: 'bg-muted text-muted-foreground ring-border',
  resolved: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
  in_review: 'bg-sky-500/10 text-sky-300 ring-sky-500/20',
}

function getStatusTone(status: string): string {
  return STATUS_TONE[status] ?? 'bg-muted text-muted-foreground ring-border'
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
    amber: 'border-brand-yellow/30',
    rose: 'border-rose-500/30',
    sky: 'border-sky-500/30',
    emerald: 'border-emerald-500/30',
  }

  const accentText: Record<NonNullable<typeof accent>, string> = {
    amber: 'text-brand-yellow',
    rose: 'text-rose-300',
    sky: 'text-sky-300',
    emerald: 'text-emerald-300',
  }

  const border = accent ? accentRing[accent] : 'border-border'

  return (
    <div
      className={`rounded-2xl border ${border} bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${accent ? accentText[accent] : 'text-muted-foreground'}`}
      >
        {label}
      </p>
      <p className="mt-3 text-4xl font-extrabold tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs font-medium text-muted-foreground">{hint}</p>
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
    <li className="border-b border-border last:border-b-0">
      <Link
        href={`/admin/ratings/${rating.id}`}
        className="flex flex-col gap-3 py-4 transition first:pt-0 last:pb-0 hover:bg-brand-yellow/[0.04] -mx-2 px-2 rounded-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="mt-1 rounded-full bg-brand-yellow/10 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow ring-1 ring-brand-yellow/20">
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
    <li className="border-b border-border last:border-b-0">
      <Link
        href={`/admin/reports/${report.id}`}
        className="flex flex-col gap-3 py-4 transition first:pt-0 last:pb-0 hover:bg-rose-500/[0.04] -mx-2 px-2 rounded-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${getStatusTone(
                  STATUS_LABEL[report.status] || report.status
                )}`}
              >
                {STATUS_LABEL[report.status] || report.status.replace(/_/g, ' ')}
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
      return 'bg-slate-500'
    }
    switch (pollStatus) {
      case 'fetching':
        return 'bg-sky-400'
      case 'error':
        return 'bg-rose-400'
      case 'idle':
      default:
        return 'bg-emerald-400'
    }
  }, [pollStatus, isPaused])

  const { stats, latestRatings, latestReports, displayNames } = snapshot

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-yellow">
              Admin
            </p>
            <h1 className="mt-2 text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.5px] leading-tight text-foreground">
              Feedback dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Resumen de la última semana y actividad reciente de
              calificaciones y reportes.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
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
            <span className="text-muted-foreground/60">·</span>
            <span>Actualizado {formatClockTime(snapshot.generatedAt)}</span>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Calificaciones"
            value={stats.ratingsCount.toLocaleString()}
            accent="amber"
            hint="Última semana"
          />
          <StatCard
            label="Reportes"
            value={stats.reportsCount.toLocaleString()}
            accent="rose"
            hint="Última semana"
          />
          <StatCard
            label="Promedio recibido por Customers"
            value={formatAverage(stats.avgRatingToCustomers)}
            accent="sky"
            hint="Última semana"
          />
          <StatCard
            label="Promedio recibido por Towers"
            value={formatAverage(stats.avgRatingToTowers)}
            accent="emerald"
            hint="Última semana"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Últimas calificaciones
              </h2>
            </div>
            {latestRatings.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
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

          <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Últimos reportes
              </h2>
            </div>
            {latestReports.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
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
