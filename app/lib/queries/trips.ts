import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_POSTGRES_URL

if (!databaseUrl) {
  throw new Error('DATABASE_POSTGRES_URL is not defined')
}

const sql = postgres(databaseUrl, { ssl: 'require' })

export type TripRow = {
  trip_id: number
  customer_id: string
  tower_id: string
  vehicle: string
  date: string
  time: string
}

export async function getTripById(tripId: number) {
  const rows = await sql<TripRow[]>`
    SELECT
      trip_id,
      customer_id,
      tower_id,
      vehicle,
      date::text AS date,
      time::text AS time
    FROM trips
    WHERE trip_id = ${tripId}
    LIMIT 1
  `

  return rows[0] ?? null
}