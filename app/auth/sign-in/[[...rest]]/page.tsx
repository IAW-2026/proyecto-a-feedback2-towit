import { SignIn } from '@clerk/nextjs'

export default async function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <SignIn />
    </div>
  )
}
