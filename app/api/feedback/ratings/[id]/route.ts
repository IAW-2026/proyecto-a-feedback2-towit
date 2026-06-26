import { sql } from '../../../../lib/db'
import { validateApiKey } from '@/app/lib/api-key-auth'
import { getRatingDetailById } from '@/app/lib/queries/admin-dashboard'
import { deleteRatingById } from '@/app/lib/queries/ratings'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const authError = validateApiKey(request)
  if (authError) return authError

  try {
    const { id } = await context.params
    const ratingId = Number(id)

    if (!Number.isInteger(ratingId) || ratingId <= 0) {
      return Response.json({ error: 'Invalid rating ID' }, { status: 400 })
    }

    const rating = await getRatingDetailById(ratingId)

    if (!rating) {
      return Response.json({ error: 'Rating not found' }, { status: 404 })
    }

    return Response.json(rating)
  } catch (error) {
    console.error('Failed to fetch rating detail', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const authError = validateApiKey(request)
  if (authError) return authError

  try {
    const { id } = await context.params
    const ratingId = Number(id)

    if (!Number.isInteger(ratingId) || ratingId <= 0) {
      return Response.json({ error: 'Invalid rating ID' }, { status: 400 })
    }

    const deleted = await deleteRatingById(ratingId)

    if (!deleted) {
      return Response.json({ error: 'Rating not found' }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Failed to delete rating', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
