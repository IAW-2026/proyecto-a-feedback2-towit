import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { isAuthenticated, redirectToSignIn,  userId } = await auth()

  if (!isAuthenticated) {
    redirectToSignIn();
  }else {
    const client = await clerkClient()
    const user = await client.users.getUser(userId).catch(() => redirectToSignIn())
    if(user?.publicMetadata?.role === "admin-feedback") {
      redirect('/admin/dashboard')
    }
    else{
      redirect(`/profile/${userId}`)
    }
  }
}