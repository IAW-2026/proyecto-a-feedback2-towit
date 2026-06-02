import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated || !userId) {
    redirect('/auth/sign-in')
  }

  const client = await clerkClient()
  const user = await client.users.getUser(userId)

  if (user.publicMetadata?.role === 'admin-feedback') {
    redirect('/admin/dashboard')
  }

  redirect(`/profile/${userId}`)
}