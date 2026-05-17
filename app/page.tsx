import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { isAuthenticated, userId } = await auth()

  if (isAuthenticated) {
    redirect(`/profile/${userId}`)
  }

  redirect('/signIn')
}