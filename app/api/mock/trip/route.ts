import { auth } from '@clerk/nextjs/server'
import postgres from 'postgres'
import { redirect } from 'next/navigation'

const databaseUrl = process.env.DATABASE_POSTGRES_URL

if (!databaseUrl) {
  throw new Error('DATABASE_POSTGRES_URL is not defined')
}

const sql = postgres(databaseUrl, { ssl: 'require' })

type TripRow = {
  trip_id: number
  customer_id: string
  tower_id: string
  vehicle: string
  date: string
  time: string
}

export async function GET() {
  const { userId, isAuthenticated } = await auth()

  if (!isAuthenticated || !userId) {
    redirect('/auth/sign-in')
  }

  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const time = now.toTimeString().split(' ')[0]

  try {
    const [trip1, trip2] = await Promise.all([
      sql<TripRow[]>`
        INSERT INTO trips (customer_id, tower_id, vehicle, date, time)
        VALUES (${userId}, 'FakeTowerId', 'Chevrolet Corsa', ${date}, ${time})
        RETURNING *
      `,
      sql<TripRow[]>`
        INSERT INTO trips (customer_id, tower_id, vehicle, date, time)
        VALUES ('FakeCustomerId', ${userId}, 'Toyota Yaris', ${date}, ${time})
        RETURNING *
      `,
    ])

    return Response.json({ trips: [trip1[0], trip2[0]] })
  } catch (error) {
    console.error('Failed to create mock trips', error)

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
