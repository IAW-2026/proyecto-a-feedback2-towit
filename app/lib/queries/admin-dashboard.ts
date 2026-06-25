import { sql } from '../db'
import { getTripById } from './trips'
import { resolveDisplayNames } from './users'

export { resolveDisplayNames }

export type RatingType = 'tower_to_customer' | 'customer_to_tower'

export type ReportStatus = string

export type DashboardStats = {
  ratingsCount: number
  reportsCount: number
  avgRatingToCustomers: number | null
  avgRatingToTowers: number | null
}

export type Rating = {
  id: number
  tripId: number
  rating: number
  type: RatingType
  tags: string | null
  comment: string | null
  raterClerkId: string
  ratedClerkId: string
  createdAt: string
}

export type Report = {
  id: number
  tripId: number
  reason: string
  description: string | null
  status: ReportStatus
  reporterClerkId: string
  reportedClerkId: string
  createdAt: string
}

export type EditableReportStatus = 'unresolved' | 'dismissed' | 'considered'

export type ReportDetail = {
  id: number
  tripId: number
  reason: string
  description: string | null
  status: ReportStatus
  reporterClerkId: string
  reportedClerkId: string
  createdAt: string
  trip: {
    vehicle: string
    date: string
  } | null
}

export const REPORT_STATUS_TONE: Record<string, string> = {
  unresolved: 'bg-rose-50 text-rose-700 ring-rose-100',
  considered: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  dismissed: 'bg-slate-100 text-slate-700 ring-slate-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  pending: 'bg-amber-50 text-amber-700 ring-amber-100',
  in_review: 'bg-sky-50 text-sky-700 ring-sky-100',
}

export type DisplayUser = {
  clerkId: string
  name: string
}

export type DashboardSnapshot = {
  stats: DashboardStats
  latestRatings: Rating[]
  latestReports: Report[]
  displayNames: Record<string, string>
  generatedAt: string
}

type StatsRow = {
  ratings_count: number
  reports_count: number
  avg_to_customers: number | null
  avg_to_towers: number | null
}

type RatingRow = {
  id: number
  trip_id: number
  rating: number
  type: RatingType
  tags: string | null
  comment: string | null
  rater_clerk_id: string
  rated_clerk_id: string
  created_at: Date
}

type ReportRow = {
  id: number
  trip_id: number
  reason: string
  description: string | null
  status: string
  reporter_clerk_id: string
  reported_clerk_id: string
  created_at: Date
}

export type RatingDetail = {
  id: number
  tripId: number
  rating: number
  type: RatingType
  tags: string | null
  comment: string | null
  raterClerkId: string
  ratedClerkId: string
  createdAt: string
  trip: {
    vehicle: number
    date: string
    time: string
  } | null
}

type RatingDetailRow = {
  id: number
  trip_id: number
  rating: number
  type: RatingType
  tags: string | null
  comment: string | null
  rater_clerk_id: string
  rated_clerk_id: string
  created_at: Date
}

const RECENT_WINDOW_DAYS = 7

function sinceFromNow(): Date {
  const since = new Date()
  since.setDate(since.getDate() - RECENT_WINDOW_DAYS)
  return since
}

export async function getDashboardStats(
  since: Date = sinceFromNow(),
): Promise<DashboardStats> {
  const rows = await sql<StatsRow[]>`
    SELECT
      (SELECT COUNT(*)::int FROM ratings WHERE created_at >= ${since}) AS ratings_count,
      (SELECT COUNT(*)::int FROM reports WHERE created_at >= ${since}) AS reports_count,
      (
        SELECT AVG(rating)::float8
        FROM ratings
        WHERE type = 'tower_to_customer' AND created_at >= ${since}
      ) AS avg_to_customers,
      (
        SELECT AVG(rating)::float8
        FROM ratings
        WHERE type = 'customer_to_tower' AND created_at >= ${since}
      ) AS avg_to_towers
  `

  const row = rows[0]

  return {
    ratingsCount: row?.ratings_count ?? 0,
    reportsCount: row?.reports_count ?? 0,
    avgRatingToCustomers: row?.avg_to_customers ?? null,
    avgRatingToTowers: row?.avg_to_towers ?? null,
  }
}

export async function getLatestRatings(limit = 10): Promise<Rating[]> {
  const rows = await sql<RatingRow[]>`
    SELECT
      id,
      trip_id,
      rating,
      type,
      tags,
      comment,
      rater_clerk_id,
      rated_clerk_id,
      created_at
    FROM ratings
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  return rows.map((row) => ({
    id: row.id,
    tripId: row.trip_id,
    rating: row.rating,
    type: row.type,
    tags: row.tags,
    comment: row.comment,
    raterClerkId: row.rater_clerk_id,
    ratedClerkId: row.rated_clerk_id,
    createdAt: row.created_at.toISOString(),
  }))
}

function combineFilters(filters: ReturnType<typeof sql>[]): ReturnType<typeof sql> | null {
  if (filters.length === 0) return null
  return filters.reduce((acc, f) => sql`${acc} AND ${f}`)
}

function dateFilterClauses(fromDate?: string, toDate?: string) {
  const clauses: ReturnType<typeof sql>[] = []
  if (fromDate) clauses.push(sql`created_at >= ${fromDate}::timestamptz`)
  if (toDate) {
    clauses.push(
      sql`created_at < ${toDate}::timestamptz + interval '1 day'`,
    )
  }
  return clauses
}

function searchFilterClauses(search?: string): ReturnType<typeof sql>[] {
  if (!search) return []

  const pattern = `%${search}%`
  return [
    sql`(id::text ILIKE ${pattern}
      OR trip_id::text ILIKE ${pattern}
      OR rater_clerk_id ILIKE ${pattern}
      OR rated_clerk_id ILIKE ${pattern})`,
  ]
}

function searchReportsFilterClauses(search?: string): ReturnType<typeof sql>[] {
  if (!search) return []

  const pattern = `%${search}%`
  return [
    sql`(id::text ILIKE ${pattern}
      OR trip_id::text ILIKE ${pattern}
      OR reporter_clerk_id ILIKE ${pattern}
      OR reported_clerk_id ILIKE ${pattern})`,
  ]
}

export async function getRatingsCount(
  fromDate?: string,
  toDate?: string,
  search?: string,
): Promise<number> {
  const filter = combineFilters([
    ...dateFilterClauses(fromDate, toDate),
    ...searchFilterClauses(search),
  ])
  const where = filter ? sql`WHERE ${filter}` : sql``

  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM ratings
    ${where}
  `

  return rows[0]?.count ?? 0
}

export async function getRatingsPage(
  page: number,
  pageSize: number,
  fromDate?: string,
  toDate?: string,
  search?: string,
): Promise<Rating[]> {
  const safePage = Math.max(1, Math.floor(page))
  const safeSize = Math.max(1, Math.floor(pageSize))
  const offset = (safePage - 1) * safeSize
  const filter = combineFilters([
    ...dateFilterClauses(fromDate, toDate),
    ...searchFilterClauses(search),
  ])
  const where = filter ? sql`WHERE ${filter}` : sql``

  const rows = await sql<RatingRow[]>`
    SELECT
      id,
      trip_id,
      rating,
      type,
      tags,
      comment,
      rater_clerk_id,
      rated_clerk_id,
      created_at
    FROM ratings
    ${where}
    ORDER BY created_at DESC, id DESC
    LIMIT ${safeSize}
    OFFSET ${offset}
  `

  return rows.map((row) => ({
    id: row.id,
    tripId: row.trip_id,
    rating: row.rating,
    type: row.type,
    tags: row.tags,
    comment: row.comment,
    raterClerkId: row.rater_clerk_id,
    ratedClerkId: row.rated_clerk_id,
    createdAt: row.created_at.toISOString(),
  }))
}

export async function getLatestReports(limit = 10): Promise<Report[]> {
  const rows = await sql<ReportRow[]>`
    SELECT
      id,
      trip_id,
      reason,
      description,
      status,
      reporter_clerk_id,
      reported_clerk_id,
      created_at
    FROM reports
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  return rows.map((row) => ({
    id: row.id,
    tripId: row.trip_id,
    reason: row.reason,
    description: row.description,
    status: row.status,
    reporterClerkId: row.reporter_clerk_id,
    reportedClerkId: row.reported_clerk_id,
    createdAt: row.created_at.toISOString(),
  }))
}

export async function getReportsCount(
  fromDate?: string,
  toDate?: string,
  search?: string,
): Promise<number> {
  const filter = combineFilters([
    ...dateFilterClauses(fromDate, toDate),
    ...searchReportsFilterClauses(search),
  ])
  const where = filter ? sql`WHERE ${filter}` : sql``

  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM reports
    ${where}
  `

  return rows[0]?.count ?? 0
}

export async function getReportsPage(
  page: number,
  pageSize: number,
  fromDate?: string,
  toDate?: string,
  search?: string,
): Promise<Report[]> {
  const safePage = Math.max(1, Math.floor(page))
  const safeSize = Math.max(1, Math.floor(pageSize))
  const offset = (safePage - 1) * safeSize
  const filter = combineFilters([
    ...dateFilterClauses(fromDate, toDate),
    ...searchReportsFilterClauses(search),
  ])
  const where = filter ? sql`WHERE ${filter}` : sql``

  const rows = await sql<ReportRow[]>`
    SELECT
      id,
      trip_id,
      reason,
      description,
      status,
      reporter_clerk_id,
      reported_clerk_id,
      created_at
    FROM reports
    ${where}
    ORDER BY created_at DESC, id DESC
    LIMIT ${safeSize}
    OFFSET ${offset}
  `

  return rows.map((row) => ({
    id: row.id,
    tripId: row.trip_id,
    reason: row.reason,
    description: row.description,
    status: row.status,
    reporterClerkId: row.reporter_clerk_id,
    reportedClerkId: row.reported_clerk_id,
    createdAt: row.created_at.toISOString(),
  }))
}

export async function getReportDetailById(
  id: number,
): Promise<ReportDetail | null> {
  const rows = await sql<ReportRow[]>`
    SELECT
      id,
      trip_id,
      reason,
      description,
      status,
      reporter_clerk_id,
      reported_clerk_id,
      created_at
    FROM reports
    WHERE id = ${id}
    LIMIT 1
  `

  const row = rows[0]

  if (!row) {
    return null
  }

  const trip = await getTripById(row.trip_id, row.reporter_clerk_id)

   if (!trip) {
    return null
  }

  return {
    id: row.id,
    tripId: row.trip_id,
    reason: row.reason,
    description: row.description,
    status: row.status,
    reporterClerkId: row.reporter_clerk_id,
    reportedClerkId: row.reported_clerk_id,
    createdAt: row.created_at.toISOString(),
    trip: {
          vehicle: trip.vehicle,
          date: trip.date,
        }
      
  }
}

export async function updateReportStatus(
  id: number,
  status: EditableReportStatus,
): Promise<void> {
  await sql`
    UPDATE reports
    SET status = ${status}
    WHERE id = ${id}
  `
}

export async function getRatingDetailById(id: number): Promise<RatingDetail | null> {
  const rows = await sql<RatingDetailRow[]>`
    SELECT
      id,
      trip_id,
      rating,
      type,
      tags,
      comment,
      rater_clerk_id,
      rated_clerk_id,
      created_at
    FROM ratings
    WHERE id = ${id}
    LIMIT 1
  `

  const row = rows[0]

  if (!row) {
    return null
  }

  const trip = await getTripById(row.trip_id, row.rater_clerk_id);
  if (!trip) {
    return null
  }

  return {
    id: row.id,
    tripId: row.trip_id,
    rating: row.rating,
    type: row.type,
    tags: row.tags,
    comment: row.comment,
    raterClerkId: row.rater_clerk_id,
    ratedClerkId: row.rated_clerk_id,
    createdAt: row.created_at.toISOString(),
    trip: {
      vehicle: trip.trip_id,
      date: trip.date,
      time: trip.date,
    }
  }
}

export type AverageRating = {
  clerkId: string
  avgRating: number
  totalRatings: number
  updatedAt: string
  displayName: string
}

type AverageRatingRow = {
  clerk_id: string
  avg_rating: number
  total_ratings: number
  updated_at: Date
}

function avgRatingSearchFilterClauses(search?: string): ReturnType<typeof sql>[] {
  if (!search) return []
  const pattern = `%${search}%`
  return [
    sql`(clerk_id ILIKE ${pattern})`,
  ]
}

export async function getAverageRatingsCount(
  search?: string,
): Promise<number> {
  const filter = combineFilters([
    ...avgRatingSearchFilterClauses(search),
  ])
  const where = filter ? sql`WHERE ${filter}` : sql``

  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM average_ratings
    ${where}
  `

  return rows[0]?.count ?? 0
}

export async function getAverageRatingsPage(
  page: number,
  pageSize: number,
  search?: string,
): Promise<AverageRating[]> {
  const safePage = Math.max(1, Math.floor(page))
  const safeSize = Math.max(1, Math.floor(pageSize))
  const offset = (safePage - 1) * safeSize

  const filter = combineFilters([
    ...avgRatingSearchFilterClauses(search),
  ])
  const where = filter ? sql`WHERE ${filter}` : sql``

  const rows = await sql<AverageRatingRow[]>`
    SELECT
      clerk_id,
      avg_rating::float8 AS avg_rating,
      total_ratings,
      updated_at
    FROM average_ratings
    ${where}
    ORDER BY total_ratings DESC, avg_rating DESC
    LIMIT ${safeSize}
    OFFSET ${offset}
  `

  const clerkIds = rows.map((r) => r.clerk_id)
  const displayNames = await resolveDisplayNames(clerkIds)

  return rows.map((row) => ({
    clerkId: row.clerk_id,
    avgRating: row.avg_rating,
    totalRatings: row.total_ratings,
    updatedAt: row.updated_at.toISOString(),
    displayName: displayNames[row.clerk_id] ?? row.clerk_id,
  }))
}

export async function getDashboardSnapshot(
  limit = 10,
): Promise<DashboardSnapshot> {
  const [stats, latestRatings, latestReports] = await Promise.all([
    getDashboardStats(),
    getLatestRatings(limit),
    getLatestReports(limit),
  ])

  const allIds = [
    ...latestRatings.flatMap((row) => [row.raterClerkId, row.ratedClerkId]),
    ...latestReports.flatMap((row) => [row.reporterClerkId, row.reportedClerkId]),
  ]

  const displayNames = await resolveDisplayNames(allIds)

  return {
    stats,
    latestRatings,
    latestReports,
    displayNames,
    generatedAt: new Date().toISOString(),
  }
}
