import { sql } from '../db'

export type ReportReason =
  | 'unsafe_driving_or_towing'
  | 'no_show_or_abandoned_trip'
  | 'inappropriate_behavior'
  | 'vehicle_or_trip_mismatch'
  | 'other'

type SubmitReportInput = {
  tripId: number
  reporterClerkId: string
  reportedClerkId: string
  serviceId: string
  reason: ReportReason
  description?: string
}

export async function submitTripReport(input: SubmitReportInput) {
  const description = input.description?.trim() || null

  await sql`
    INSERT INTO reports (
      trip_id,
      reporter_clerk_id,
      reported_clerk_id,
      service_id,
      reason,
      description,
      status
    )
    VALUES (
      ${input.tripId},
      ${input.reporterClerkId},
      ${input.reportedClerkId},
      ${input.serviceId},
      ${input.reason},
      ${description},
      'unresolved'
    )
  `
}