import { SignUp } from '@clerk/nextjs'

export default async function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <SignUp />
    </div>
  )
}
