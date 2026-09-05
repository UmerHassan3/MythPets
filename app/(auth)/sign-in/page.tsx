import { auth } from '@/auth'
import SignInForm from '@/Components/SignInForm'
import { redirect } from 'next/navigation'

const page = async () => {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/")
  }

  return (
    <>
      <div className="mb-8 space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to track your orders, stock alerts and trade history.
        </p>
      </div>

      <SignInForm />
    </>
  )
}

export default page
