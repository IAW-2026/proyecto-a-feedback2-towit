import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_POSTGRES_URL

if (!databaseUrl) {
  throw new Error('DATABASE_POSTGRES_URL is not defined')
}

const sql = postgres(databaseUrl, { ssl: 'require' })

type RouteContext = {
  params: {
    id: string
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const rows = await sql<{ avg_rating: number }[]>`
      SELECT avg_rating::float8 AS avg_rating
      FROM average_ratings
      WHERE clerk_id = ${params.id}
      LIMIT 1
    `

    const rating = rows[0]

    if (!rating) {
      return Response.json({ error: 'Average rating not found' }, { status: 404 })
    }

    return Response.json({ avg_rating: rating.avg_rating })
  } catch (error) {
    console.error('Failed to fetch average rating', error)

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}