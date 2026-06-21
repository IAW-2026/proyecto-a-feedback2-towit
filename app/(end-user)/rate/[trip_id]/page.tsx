import Link from 'next/link'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getTripById } from '../../../lib/queries/trips'
import {
	CUSTOMER_PRESET_TAGS,
	getTripRatingByUser,
	submitTripRating,
	type RatingType,
} from '../../../lib/queries/ratings'
import { CustomerTagChips } from '../../../ui/customer-tag-chips'

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

function getTagLabel(slug: string | null) {
	if (!slug) {
		return null
	}
	return CUSTOMER_PRESET_TAGS.find((tag) => tag.slug === slug)?.label ?? null
}

export default async function RateTripPage({ params }: PageProps) {
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
		console.log("trip not found")
		notFound()
	}

	const isCustomer = currentUserRole === 'customer'
	const isTower = currentUserRole === 'tower'

	if (!isCustomer && !isTower) {
		notFound()
	}

	const ratedClerkId = isCustomer ? trip.tower_id : trip.customer_id
	const ratingType: RatingType = isCustomer
		? 'customer_to_tower'
		: 'tower_to_customer'

	const ratedUser = await clerk.users.getUser(ratedClerkId).catch(() => null)
	const ratedUserName = getDisplayName(ratedUser, ratedClerkId)
	const existingRating = await getTripRatingByUser(tripId, userId)
	const existingTagLabel = getTagLabel(existingRating?.tags ?? null)

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

		const rawTag = formData.get('tag')
		const tagValue = typeof rawTag === 'string' && rawTag.length > 0 ? rawTag : null

		const rawComment = formData.get('comment')
		const commentValue =
			typeof rawComment === 'string' && rawComment.trim().length > 0
				? rawComment.trim().slice(0, 500)
				: null

		await submitTripRating({
			tripId,
			raterClerkId: currentUserId,
			ratedClerkId,
			rating: ratingValue,
			type: ratingType,
			tags: tagValue,
			comment: commentValue,
		})

		revalidatePath(`/history`)
		redirect(`/history`)
	}

	return (
		<main className="min-h-screen bg-background px-6 py-10 text-foreground">
			<div className="mx-auto max-w-3xl space-y-6">
				<Link
					href={existingRating ? "/ratings-history" : "/history"}
					className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
				>
					← Volver al historial
				</Link>

				<section className="overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm">
					<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-yellow">
						Calificar viaje
					</p>
					<h1 className="mt-3 text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.5px] leading-tight text-foreground">
						¿Cómo fue tu viaje?
					</h1>
					<p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
						Estás calificando a {ratedUserName}. Selecciona de una a cinco estrellas y envía tu feedback.
					</p>

					<div className="mt-8 grid gap-4 rounded-2xl bg-muted p-5 sm:grid-cols-2">
						<div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
							<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
								Vehículo
							</p>
							<p className="mt-2 text-lg font-bold text-foreground">{trip.vehicle}</p>
						</div>
						<div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
							<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
								Fecha del viaje
							</p>
							<p className="mt-2 text-lg font-bold text-foreground">
								{trip.date}
							</p>
						</div>
					</div>

					{existingRating ? (
						<div className="mt-10 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/5 p-6">
							<p className="text-sm font-bold text-brand-yellow">Ya calificaste este viaje.</p>
							<p className="mt-2 text-sm text-brand-yellow/80">
								Calificación: {existingRating.rating} <span className="text-brand-yellow">★</span>
							</p>
							{isCustomer && (existingTagLabel || existingRating.comment) ? (
								<div className="mt-4 space-y-3 rounded-2xl bg-card p-4 ring-1 ring-brand-yellow/20">
									{existingTagLabel ? (
										<div>
											<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-yellow">
												Feedback rápido
											</p>
											<p className="mt-1 text-sm font-bold text-foreground">
												{existingTagLabel}
											</p>
										</div>
									) : null}
									{existingRating.comment ? (
										<div>
											<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-yellow">
												Comentario
											</p>
											<p className="mt-1 whitespace-pre-line text-sm text-foreground">
												{existingRating.comment}
											</p>
										</div>
									) : null}
								</div>
							) : null}
							<div className="mt-6 flex flex-wrap items-center gap-3">
								<Link
									href="/history"
									className="inline-flex items-center justify-center rounded-lg bg-brand-yellow px-6 py-3 text-sm font-bold text-black transition hover:bg-brand-yellow-hover active:scale-95"
								>
									Volver al historial
								</Link>
								<Link
									href={`/report/${tripId}`}
									className="inline-flex items-center justify-center rounded-lg border-2 border-rose-500/30 bg-rose-500/10 px-6 py-3 text-sm font-semibold text-rose-300 transition hover:border-rose-500/50 hover:bg-rose-500/20"
								>
									Reportar este viaje
								</Link>
							</div>
						</div>
					) : (
						<form action={submitRating} className="mt-10">
							<input type="hidden" name="tripId" value={trip.trip_id} />
							<input type="hidden" name="ratedClerkId" value={ratedClerkId} />
							<input type="hidden" name="type" value={ratingType} />

							<fieldset>
								<legend className="text-sm font-bold text-foreground">
									Elige una calificación
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
												className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border border-border bg-card text-3xl text-muted-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-brand-yellow/40 hover:text-brand-yellow peer-checked:border-brand-yellow peer-checked:bg-brand-yellow/10 peer-checked:text-brand-yellow"
											>
												★
											</label>
											<span className="text-xs font-medium text-muted-foreground">{value}</span>
										</div>
									))}
								</div>
							</fieldset>

							{isCustomer ? (
								<>
									<fieldset className="mt-10">
										<legend className="text-sm font-bold text-foreground">
											Feedback rápido
										</legend>
										<p className="mt-1 text-xs text-muted-foreground">
											Elige la opción que mejor describa a {ratedUserName}. Haz clic en una opción seleccionada para borrarla.
										</p>
										<CustomerTagChips name="tag" options={CUSTOMER_PRESET_TAGS} />
									</fieldset>

									<div className="mt-8">
										<label
											htmlFor="comment"
											className="text-sm font-bold text-foreground"
										>
											Agregar opinión (opcional)
										</label>
										<textarea
											id="comment"
											name="comment"
											rows={3}
											maxLength={500}
											placeholder="Share anything else worth mentioning about the service…"
											className="mt-2 block w-full resize-y rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground focus:border-brand-yellow focus:outline-none focus:ring-2 focus:ring-brand-yellow/40"
										/>
										<p className="mt-1 text-xs text-muted-foreground">
											Máximo 500 caracteres.
										</p>
									</div>
								</>
							) : null}

							<div className="mt-8 flex flex-wrap items-center gap-3">
								<button
									type="submit"
									className="inline-flex items-center justify-center rounded-lg bg-brand-yellow px-6 py-3 text-sm font-bold text-black transition hover:bg-brand-yellow-hover active:scale-95"
								>
									Enviar calificación
								</button>
								<Link
									href={`/report/${tripId}`}
									className="inline-flex items-center justify-center rounded-lg border-2 border-rose-500/30 bg-rose-500/10 px-6 py-3 text-sm font-semibold text-rose-300 transition hover:border-rose-500/50 hover:bg-rose-500/20"
								>
									Reportar este viaje
								</Link>
							</div>
						</form>
					)}
				</section>
			</div>
		</main>
	)
}
