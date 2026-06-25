import { validateApiKey } from '@/app/lib/api-key-auth'
import {
  getAverageRatingsPage,
  getAverageRatingsCount,
} from '@/app/lib/queries/admin-dashboard'

export async function GET(request: Request) {
  const authError = validateApiKey(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10) || 10))
    const search = searchParams.get('search') ?? undefined

    const [data, total] = await Promise.all([
      getAverageRatingsPage(page, pageSize, search),
      getAverageRatingsCount(search),
    ])

    return Response.json({ data, total, page, pageSize })
  } catch (error) {
    console.error('Failed to fetch average ratings', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
