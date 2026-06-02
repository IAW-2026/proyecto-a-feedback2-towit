import { auth, clerkClient } from '@clerk/nextjs/server'
import { getDashboardSnapshot } from '../../../lib/queries/admin-dashboard'

export async function GET() {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated || !userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await clerkClient()
  const user = await client.users.getUser(userId).catch(() => null)
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role

  if (role !== 'admin-feedback') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const snapshot = await getDashboardSnapshot(10)
    return Response.json(snapshot)
  } catch (error) {
    console.error('Failed to load admin dashboard snapshot', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
