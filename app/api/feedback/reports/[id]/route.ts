import { validateApiKey } from '@/app/lib/api-key-auth'
import { getReportDetailById } from '@/app/lib/queries/admin-dashboard'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const authError = validateApiKey(request)
  if (authError) return authError

  try {
    const { id } = await context.params
    const reportId = Number(id)

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return Response.json({ error: 'Invalid report ID' }, { status: 400 })
    }

    const report = await getReportDetailById(reportId)

    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 })
    }

    return Response.json(report)
  } catch (error) {
    console.error('Failed to fetch report detail', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
