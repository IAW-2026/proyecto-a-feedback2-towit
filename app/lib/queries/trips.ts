import { getTripRatingByUser } from './ratings'

export type TripRow = {
  trip_id: number
  customer_id: string
  tower_id: string
  vehicle_id: string
  origin: {lat: string, long: string}
  destination: {lat: string, long: string}
  date: string
  time: string
  status: string
}

export type UserTripRole = 'customer' | 'tower'


export async function getTripById(tripId: number, userId: string) : Promise<TripRow | null> {
  const trips = await getUserTrips(userId)
  const trip = trips.find((t: TripRow) => Number(t.trip_id) === tripId)
  return trip ?? null
}

async function getUserTrips(userId: string): Promise<TripRow[]> {
  const tripsApiUrl = process.env.TRIPS_API_URL
  if (!tripsApiUrl) {
  throw new Error('TRIPS_API_URL is not defined')
  }
  const response = await fetch(`${tripsApiUrl}/${userId}`, {method: 'GET'})
  const trips = await response.json()
  console.log('Fetched trips:', trips)
  return trips
}

// Devuelve los viajes en los que participó el usuario (como customer o tower,
// según su rol) que aún no tienen una calificación suya. También devuelve el
// total sin paginar para poder armar la paginación en la página.
export async function getUserPendingTrips(params: {
  userId: string
  role: UserTripRole
  limit: number
  offset: number
}): Promise<{ items: TripRow[]; total: number }> {



  
  const { userId } = params
  const trips = await getUserTrips(userId)
  const pendingTrips = trips.filter((trip: TripRow) => {
    return getTripRatingByUser(trip.trip_id, userId) != null
  })
  return {items: pendingTrips, total: pendingTrips.length}


  /*
  const [rows, countRows] = await Promise.all([
    sql<PendingTripRow[]>`
      SELECT
        t.trip_id,
        t.vehicle,
        t.date::text AS date,
        t.time::text AS time,
        CASE
          WHEN t.customer_id = ${userId} THEN t.tower_id
          ELSE t.customer_id
        END AS counterpart_clerk_id,
        CASE
          WHEN t.customer_id = ${userId} THEN 'customer'
          ELSE 'tower'
        END AS user_role_in_trip
      FROM trips t
      LEFT JOIN ratings r
        ON r.trip_id = t.trip_id
        AND r.rater_clerk_id = ${userId}
      WHERE
        r.id IS NULL
        AND (
          (${role} = 'customer' AND t.customer_id = ${userId})
          OR (${role} = 'tower' AND t.tower_id = ${userId})
        )
      ORDER BY t.date DESC, t.time DESC, t.trip_id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `,
    sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM trips t
      LEFT JOIN ratings r
        ON r.trip_id = t.trip_id
        AND r.rater_clerk_id = ${userId}
      WHERE
        r.id IS NULL
        AND (
          (${role} = 'customer' AND t.customer_id = ${userId})
          OR (${role} = 'tower' AND t.tower_id = ${userId})
        )
    `,
  ])

  return {
    items: rows,
    total: countRows[0]?.count ?? 0,
  }*/
}