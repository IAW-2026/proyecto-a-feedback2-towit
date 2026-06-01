import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_POSTGRES_URL

if (!databaseUrl) {
  throw new Error('DATABASE_POSTGRES_URL is not defined')
}

const sql = postgres(databaseUrl, { ssl: 'require' })

type RouteContext = {
  params: Promise<{
    trip_id: string,
    user_id: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
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