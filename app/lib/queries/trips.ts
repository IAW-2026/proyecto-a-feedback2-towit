import { getTripRatingByUser } from './ratings'

export type TripRow = {
  trip_id: number
  customer_id: string
  customer_clerk_id: string
  tower_id: string
  vehicle_id: string
  origin: {lat: string, long: string}
  destination: {lat: string, long: string}
  date: string
  status: string
}

export type TripData = {
  trip_id: number
  customer_id: string
  tower_id: string
  user_role_in_trip: UserTripRole
  vehicle: string
  date: string
  counterpart_clerk_id: string
}

export type UserTripRole = 'customer' | 'tower'


export async function getTripById(tripId: number, userId: string) : Promise<TripData | null> {  
  const trips = await getUserTrips(userId)
  const trip = trips.find((t: TripData) => Number(t.trip_id) === tripId)
  if (!trip) {
    return null
  }
  return trip
  
}

async function getUserTrips(userId: string): Promise<TripData[]> {
  const tripsApiUrl = process.env.TRIPS_API_URL
  if (!tripsApiUrl) {
  throw new Error('TRIPS_API_URL is not defined')
  }  
  const vehiclesApiUrl = process.env.VEHICLES_API_URL
  if (!vehiclesApiUrl) {
  throw new Error('VEHICLES_API_URL is not defined')
  }
  const response = await fetch(`${tripsApiUrl}/${userId}`, {method: 'GET', headers: { 'x-api-key': process.env.INTERNAL_API_SECRET ?? '' }})
  const trips: TripRow[] = await response.json()
  const tripsWithVehicle = await Promise.all(trips.map(async (trip) => {
    const vehicleResponse = await fetch(`${vehiclesApiUrl}/${trip?.vehicle_id}`, {method: 'GET', headers: { 'x-api-key': process.env.INTERNAL_API_SECRET ?? '' }})
    const vehicle = await vehicleResponse.json()
    if (!vehicle) {
      vehicle.name = 'Vehículo no disponible'
    }
    const userRoleInTrip : UserTripRole = trip.customer_clerk_id === userId ? 'customer' : 'tower'
    return {
      trip_id: trip.trip_id,
      customer_id: trip.customer_clerk_id,
      tower_id: trip.tower_id,
      user_role_in_trip: userRoleInTrip,
      vehicle: vehicle.name,
      date: trip.date,
      counterpart_clerk_id: userId === trip.customer_clerk_id ? trip.tower_id : trip.customer_clerk_id
    }
  }))
  return tripsWithVehicle
}

// Devuelve los viajes en los que participó el usuario (como customer o tower,
// según su rol) que aún no tienen una calificación suya. También devuelve el
// total sin paginar para poder armar la paginación en la página.
export async function getUserPendingTrips(params: {
  userId: string
  limit: number
  offset: number
}): Promise<{ items: TripData[]; total: number }> {
  const { userId, limit, offset } = params
  const trips = await getUserTrips(userId)

  const ratingResults = await Promise.all(
    trips.map((trip) => getTripRatingByUser(trip.trip_id, userId))
  )

  const pendingTrips = trips.filter((_, index) => ratingResults[index] == null)

  const total = pendingTrips.length
  const items = pendingTrips.slice(offset, offset + limit)

  return { items, total }


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