import { sql } from '../../../../../lib/db'
import { validateApiKey } from '@/app/lib/api-key-auth'

type RouteContext = {
  params: Promise<{
    trip_id: string,
    user_id: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  const authError = validateApiKey(request)
  if (authError) return authError

  const params = await context.params;
  try {
    const rows = await sql<{ rating: number }[]>`
      SELECT rating
      FROM ratings
      WHERE trip_id = ${params.trip_id} AND rater_clerk_id = ${params.user_id}
      LIMIT 1
    `

    const rating = rows[0]

    if (!rating) {
      return Response.json({ error: 'Rating not found' }, { status: 404 })
    }

    return Response.json({ rating: rating.rating })
  } catch (error) {
    console.error('Failed to fetch rating', error)

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}