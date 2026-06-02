import { sql } from '../db'

export type RatingType = 'tower_to_customer' | 'customer_to_tower'

export const CUSTOMER_PRESET_TAGS = [
  { slug: 'polite', label: 'Amable' },
  { slug: 'punctual', label: 'Puntual' },
  { slug: 'took_care_of_vehicle', label: 'Cuidadoso con el vehículo' },
  { slug: 'good_communication', label: 'Buena comunicación' },
  { slug: 'professional', label: 'Profesional' },
] as const

export type CustomerPresetTagSlug = (typeof CUSTOMER_PRESET_TAGS)[number]['slug']

const ALLOWED_TAG_SLUGS = new Set<string>(
  CUSTOMER_PRESET_TAGS.map((tag) => tag.slug),
)

export type ExistingTripRating = {
  rating: number
  tags: string | null
  comment: string | null
}

type AverageRatingRow = {
  avg_rating: number
  total_ratings: number
}

type SubmitRatingInput = {
  tripId: number
  raterClerkId: string
  ratedClerkId: string
  rating: number
  type: RatingType
  tags?: string | null
  comment?: string | null
}

function sanitizeTag(input: string | null | undefined): string | null {
  if (!input) {
    return null
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  if (!ALLOWED_TAG_SLUGS.has(trimmed)) {
    throw new Error('Invalid tag')
  }

  return trimmed
}

function sanitizeComment(input: string | null | undefined): string | null {
  if (!input) {
    return null
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.length > 500) {
    throw new Error('Comment too long')
  }

  return trimmed
}

export async function getTripRatingByUser(tripId: number, raterClerkId: string) {
  const rows = await sql<ExistingTripRating[]>`
    SELECT rating, tags, comment
    FROM ratings
    WHERE trip_id = ${tripId} AND rater_clerk_id = ${raterClerkId}
    LIMIT 1
  `

  return rows[0] ?? null
}

export async function submitTripRating(input: SubmitRatingInput) {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error('Invalid rating value')
  }

  const tags = sanitizeTag(input.tags)
  const comment = sanitizeComment(input.comment)

  await sql.begin(async (transaction) => {
    const existingRatingRows = await transaction<ExistingTripRating[]>`
      SELECT rating
      FROM ratings
      WHERE trip_id = ${input.tripId} AND rater_clerk_id = ${input.raterClerkId}
      LIMIT 1
    `

    if (existingRatingRows[0]) {
      throw new Error('Rating already exists for this trip and user')
    }

    await transaction`
      INSERT INTO ratings (
        trip_id,
        rater_clerk_id,
        rated_clerk_id,
        rating,
        tags,
        comment,
        type
      )
      VALUES (
        ${input.tripId},
        ${input.raterClerkId},
        ${input.ratedClerkId},
        ${input.rating},
        ${tags},
        ${comment},
        ${input.type}
      )
    `

    const rows = await transaction<AverageRatingRow[]>`
      SELECT avg_rating::float8 AS avg_rating, total_ratings
      FROM average_ratings
      WHERE clerk_id = ${input.ratedClerkId}
      LIMIT 1
    `

    const currentAverage = rows[0]

    if (currentAverage) {
      const nextTotalRatings = currentAverage.total_ratings + 1
      const nextAverageRating =
        (currentAverage.avg_rating * currentAverage.total_ratings + input.rating) /
        nextTotalRatings

      await transaction`
        UPDATE average_ratings
        SET avg_rating = ${nextAverageRating},
            total_ratings = ${nextTotalRatings},
            updated_at = NOW()
        WHERE clerk_id = ${input.ratedClerkId}
      `
      return
    }

    await transaction`
      INSERT INTO average_ratings (
        clerk_id,
        avg_rating,
        total_ratings,
        updated_at
      )
      VALUES (
        ${input.ratedClerkId},
        ${input.rating},
        1,
        NOW()
      )
    `
  })
}
