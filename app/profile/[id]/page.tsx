import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { isAuthenticated } = await auth()
  const { id } = await params

  if (!isAuthenticated) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Profile: {id}</h1>
    </div>
  )
}