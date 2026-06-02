import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getDashboardSnapshot } from '../../lib/queries/admin-dashboard'
import { DashboardView } from './dashboard-view'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated || !userId) {
    redirect('/auth/sign-in')
  }

  const client = await clerkClient()
  const user = await client.users.getUser(userId).catch(() => null)
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role

  if (role !== 'admin-feedback') {
    redirect('/')
  }

  const snapshot = await getDashboardSnapshot(10)

  return <DashboardView initial={snapshot} />
}
