import { sql } from '../db'

export type TripRow = {
  trip_id: number
  customer_id: string
  tower_id: string
  vehicle: string
  date: string
  time: string
}

export type UserTripRole = 'customer' | 'tower'

export type PendingTripItem = {
  trip_id: number
  vehicle: string
  date: string
  time: string
  counterpart_clerk_id: string
  user_role_in_trip: UserTripRole
}

type PendingTripRow = {
  trip_id: number
  vehicle: string
  date: string
  time: string
  counterpart_clerk_id: string
  user_role_in_trip: UserTripRole
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

// Devuelve los viajes en los que participó el usuario (como customer o tower,
// según su rol) que aún no tienen una calificación suya. También devuelve el
// total sin paginar para poder armar la paginación en la página.
export async function getUserPendingTrips(params: {
  userId: string
  role: UserTripRole
  limit: number
  offset: number
}): Promise<{ items: PendingTripItem[]; total: number }> {
  const { userId, role, limit, offset } = params

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
  }
}