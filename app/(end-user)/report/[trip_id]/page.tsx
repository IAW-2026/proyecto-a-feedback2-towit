import Link from 'next/link'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getTripById } from '../../../lib/queries/trips'
import {
  submitTripReport,
  type ReportReason,
} from '../../../lib/queries/reports'
import { isValidReturnUrl } from '../../../lib/url'

type PageProps = {
  params: Promise<{
    trip_id: string
  }>
  searchParams: Promise<{
    return_url?: string
  }>
}

function getDisplayName(
  user: {
    fullName: string | null
    username: string | null
    firstName: string | null
    lastName: string | null
  } | null,
  fallback: string
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

const reportReasonOptions: Array<{
  value: ReportReason
  label: string
  description: string
}> = [
  {
    value: 'unsafe_driving_or_towing',
    label: 'Conducción o remolque inseguro',
    description: 'Comportamiento peligroso durante el viaje o el proceso de remolque.',
  },
  {
    value: 'no_show_or_abandoned_trip',
    label: 'No se presentó o abandonó el viaje',
    description: 'El otro usuario no apareció o dejó el viaje sin terminar.',
  },
  {
    value: 'inappropriate_behavior',
    label: 'Comportamiento inapropiado',
    description: 'Acoso, abuso o otra interacción inaceptable.',
  },
  {
    value: 'vehicle_or_trip_mismatch',
    label: 'Vehículo o viaje no coincidente',
    description: 'El vehículo o los detalles del viaje no coinciden con lo acordado.',
  },
  {
    value: 'other',
    label: 'Otro',
    description: 'Cualquier otro problema que no se ajuste a las opciones anteriores.',
  },
]

export default async function ReportTripPage({ params, searchParams }: PageProps) {
  const { userId, isAuthenticated } = await auth()

  if (!isAuthenticated || !userId) {
    redirect('/auth/sign-in')
  }

  const clerk = await clerkClient()
  const currentUser = await clerk.users.getUser(userId).catch(() => null)
  const currentUserRole = currentUser?.publicMetadata?.role

  const { trip_id } = await params
  const tripId = Number(trip_id)

  if (!Number.isInteger(tripId)) {
    notFound()
  }

  const trip = await getTripById(tripId, userId)

  if (!trip) {
    notFound()
  }

  const isCustomer = currentUserRole === 'customer'
  const isTower = currentUserRole === 'tower'

  if (!isCustomer && !isTower) {
    notFound()
  }

  const reportedClerkId = isCustomer ? trip.tower_id : trip.customer_id
  const reportedUser = await clerk.users.getUser(reportedClerkId).catch(() => null)
  const reportedUserName = getDisplayName(reportedUser, reportedClerkId)

  const sp = await searchParams
  const safeReturnUrl = sp.return_url && isValidReturnUrl(sp.return_url)
    ? sp.return_url
    : null

  async function submitReport(formData: FormData) {
    'use server'

    const { userId: currentUserId, isAuthenticated: currentIsAuthenticated } =
      await auth()

    if (!currentIsAuthenticated || !currentUserId) {
      redirect('/auth/sign-in')
    }

    const reason = formData.get('reason')
    const description = formData.get('description')

    if (typeof reason !== 'string' || !reason) {
      throw new Error('Reason is required')
    }

    if (!isCustomer && !isTower) {
      notFound()
    }

    await submitTripReport({
      tripId,
      reporterClerkId: currentUserId,
      reportedClerkId,
      serviceId: tripId.toString(),
      reason: reason as ReportReason,
      description: typeof description === 'string' ? description : undefined,
    })

    revalidatePath(safeReturnUrl ?? '/history')
    redirect(safeReturnUrl ?? '/history')
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← Volver al historial
        </Link>

        <section className="overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-400">
            Reportar viaje
          </p>
          <h1 className="mt-3 text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.5px] leading-tight text-foreground">
            Reportar a {reportedUserName}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Selecciona el motivo por el cual estás reportando este viaje. Puedes agregar una descripción adicional para proporcionar más detalles sobre el incidente.
          </p>

          <div className="mt-8 grid gap-4 rounded-2xl bg-muted p-5 sm:grid-cols-2">
            <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Trip
              </p>
              <p className="mt-2 text-lg font-bold text-foreground">#{trip.trip_id}</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Detalles del viaje
              </p>
              <p className="mt-2 text-lg font-bold text-foreground">{trip.vehicle}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {trip.date}
              </p>
            </div>
          </div>

          <form action={submitReport} className="mt-10 space-y-8">
            <fieldset>
              <legend className="text-sm font-bold text-foreground">
                Motivo del reporte
              </legend>
              <div className="mt-4 grid gap-3">
                {reportReasonOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-rose-500/40 hover:bg-rose-500/5"
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={option.value}
                      required
                      className="mt-1 h-4 w-4 border-border bg-card text-rose-500 focus:ring-rose-500"
                    />
                    <span className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">
                        {option.label}
                      </span>
                      <span className="text-sm text-muted-foreground">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="text-sm font-bold text-foreground">
                Descripción opcional
              </span>
              <textarea
                name="description"
                rows={5}
                placeholder="Agrega cualquier detalle adicional que pueda ayudar a revisar este reporte."
                className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-brand-yellow px-6 py-3 text-sm font-bold text-black transition hover:bg-brand-yellow-hover active:scale-95"
              >
                Enviar reporte
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
