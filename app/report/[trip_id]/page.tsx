import Link from 'next/link'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getTripById } from '../../lib/queries/trips'
import {
  submitTripReport,
  type ReportReason,
} from '../../lib/queries/reports'

type PageProps = {
  params: Promise<{
    trip_id: string
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
    label: 'Unsafe driving or towing',
    description: 'Dangerous behavior during the trip or towing process.',
  },
  {
    value: 'no_show_or_abandoned_trip',
    label: 'No-show or abandoned trip',
    description: 'The other user did not appear or left the trip unfinished.',
  },
  {
    value: 'inappropriate_behavior',
    label: 'Inappropriate behavior',
    description: 'Harassment, abuse, or another unacceptable interaction.',
  },
  {
    value: 'vehicle_or_trip_mismatch',
    label: 'Vehicle or trip mismatch',
    description: 'The vehicle, service, or trip details did not match.',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Any other issue that does not fit the options above.',
  },
]

export default async function ReportTripPage({ params }: PageProps) {
  const { userId, isAuthenticated } = await auth()

  if (!isAuthenticated || !userId) {
    redirect('/auth/sign-in')
  }

  const { trip_id } = await params
  const tripId = Number(trip_id)

  if (!Number.isInteger(tripId)) {
    notFound()
  }

  const trip = await getTripById(tripId)

  if (!trip) {
    notFound()
  }

  const isCustomer = trip.customer_id === userId
  const isTower = trip.tower_id === userId

  if (!isCustomer && !isTower) {
    notFound()
  }

  const reportedClerkId = isCustomer ? trip.tower_id : trip.customer_id
  const clerk = await clerkClient()
  const reportedUser = await clerk.users.getUser(reportedClerkId).catch(() => null)
  const reportedUserName = getDisplayName(reportedUser, reportedClerkId)

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

    revalidatePath('/history')
    redirect('/history')
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fee2e2_0,_#fff7ed_28%,_#f8fafc_70%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          ← Back to history
        </Link>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-red-700">
            Report trip
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Report {reportedUserName}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Select the reason that best matches the issue and add an optional description.
          </p>

          <div className="mt-8 grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                Trip
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">#{trip.trip_id}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                Trip details
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{trip.vehicle}</p>
              <p className="mt-1 text-sm text-slate-500">
                {trip.date} · {trip.time}
              </p>
            </div>
          </div>

          <form action={submitReport} className="mt-10 space-y-8">
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">
                Reason for report
              </legend>
              <div className="mt-4 grid gap-3">
                {reportReasonOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-red-200 hover:bg-red-50/40"
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={option.value}
                      required
                      className="mt-1 h-4 w-4 border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900">
                        {option.label}
                      </span>
                      <span className="text-sm text-slate-500">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Optional description
              </span>
              <textarea
                name="description"
                rows={5}
                placeholder="Add any extra details that could help review this report."
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:ring-4 focus:ring-red-100"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Submit report
              </button>
              <span className="text-sm text-slate-500">
                The report will be created with status unresolved.
              </span>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}