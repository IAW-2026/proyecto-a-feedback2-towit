import Link from 'next/link'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getTripById } from '../../lib/queries/trips'
import {
	getTripRatingByUser,
	submitTripRating,
	type RatingType,
} from '../../lib/queries/ratings'

export const dynamic = 'force-dynamic'

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

export default async function RateTripPage({ params }: PageProps) {
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

	const ratedClerkId = isCustomer ? trip.tower_id : trip.customer_id
	const ratingType: RatingType = isCustomer
		? 'customer_to_tower'
		: 'tower_to_customer'

	const clerk = await clerkClient()
	const ratedUser = await clerk.users.getUser(ratedClerkId).catch(() => null)
	const ratedUserName = getDisplayName(ratedUser, ratedClerkId)
	const existingRating = await getTripRatingByUser(tripId, userId)

	async function submitRating(formData: FormData) {
		'use server'

		const { userId: currentUserId, isAuthenticated: currentIsAuthenticated } =
			await auth()

		if (!currentIsAuthenticated || !currentUserId) {
			redirect('/auth/sign-in')
		}

		const ratingValue = Number(formData.get('rating'))

		if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
			throw new Error('Invalid rating value')
		}

		const alreadyRated = await getTripRatingByUser(tripId, currentUserId)

		await submitTripRating({
			tripId,
			raterClerkId: currentUserId,
			ratedClerkId,
			rating: ratingValue,
			type: ratingType,
		})

		revalidatePath(`/history`)
		redirect(`/history`)
	}

	return (
		<main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7_0,_#fff7ed_28%,_#f8fafc_70%)] px-6 py-10 text-slate-900">
			<div className="mx-auto max-w-3xl">
				<Link
					href="/history"
					className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
				>
					← Back to history
				</Link>

				<section className="mt-6 overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
					<p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
						Rate trip
					</p>
					<h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
						How was your trip?
					</h1>
					<p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
						You are rating {ratedUserName}. Select one to five stars and submit your feedback.
					</p>

					<div className="mt-8 grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-2">
						<div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
							<p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
								Vehicle
							</p>
							<p className="mt-2 text-lg font-semibold text-slate-900">{trip.vehicle}</p>
						</div>
						<div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
							<p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
								Trip date
							</p>
							<p className="mt-2 text-lg font-semibold text-slate-900">
								{trip.date} · {trip.time}
							</p>
						</div>
					</div>

					{existingRating ? (
						<div className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-6">
							<p className="text-sm font-medium text-amber-900">You already rated this trip.</p>
							<p className="mt-2 text-sm text-amber-800">
								Saved rating: {existingRating.rating} ★
							</p>
							<div className="mt-6">
								<Link
									href="/history"
									className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
								>
									Back to history
								</Link>
							</div>
						</div>
					) : (
						<form action={submitRating} className="mt-10">
							<input type="hidden" name="tripId" value={trip.trip_id} />
							<input type="hidden" name="ratedClerkId" value={ratedClerkId} />
							<input type="hidden" name="type" value={ratingType} />

							<fieldset>
								<legend className="text-sm font-medium text-slate-700">
									Choose a rating
								</legend>
								<div className="mt-4 flex flex-wrap items-end gap-3">
									{[1, 2, 3, 4, 5].map((value) => (
										<div key={value} className="flex flex-col items-center gap-2">
											<input
												id={`rating-${value}`}
												type="radio"
												name="rating"
												value={value}
												required
												className="peer sr-only"
											/>
											<label
												htmlFor={`rating-${value}`}
												className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-3xl text-slate-300 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:text-amber-400 peer-checked:border-amber-300 peer-checked:bg-amber-50 peer-checked:text-amber-500"
											>
												★
											</label>
											<span className="text-xs font-medium text-slate-500">{value}</span>
										</div>
									))}
								</div>
							</fieldset>

							<div className="mt-8 flex flex-wrap items-center gap-3">
								<button
									type="submit"
									className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
								>
									Submit rating
								</button>
								<span className="text-sm text-slate-500">
									Your rating will update the average automatically.
								</span>
							</div>
						</form>
					)}
				</section>
			</div>
		</main>
	)
}
