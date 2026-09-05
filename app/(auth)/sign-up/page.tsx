import SignUpForm from '@/Components/SignUpForm'
import { auth } from '@/auth'
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
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Join MythPets to buy pets, track orders and get stock alerts.
        </p>
      </div>

      <SignUpForm />
    </>
  )
}

export default page
