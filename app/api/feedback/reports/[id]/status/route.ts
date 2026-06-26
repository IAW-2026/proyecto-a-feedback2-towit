import { validateApiKey } from '@/app/lib/api-key-auth'
import {
  updateReportStatus,
  type EditableReportStatus,
} from '@/app/lib/queries/admin-dashboard'

const ALLOWED_STATUSES: ReadonlyArray<EditableReportStatus> = [
  'unresolved',
  'dismissed',
  'considered',
]

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = validateApiKey(request)
  if (authError) return authError

  try {
    const { id } = await context.params
    const reportId = Number(id)

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return Response.json({ error: 'Invalid report ID' }, { status: 400 })
    }

    let body: { status?: string }
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (
      typeof body.status !== 'string' ||
      !ALLOWED_STATUSES.includes(body.status as EditableReportStatus)
    ) {
      return Response.json(
        {
          error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
        },
        { status: 400 },
      )
    }

    await updateReportStatus(reportId, body.status as EditableReportStatus)

    return Response.json({ success: true })
  } catch (error) {
    console.error('Failed to update report status', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
