import SignUpForm from '@/Components/SignUpForm'
import GoogleSignInButton from '@/Components/GoogleSignInButton'
import AuthDivider from '@/Components/AuthDivider'
import { auth, googleEnabled } from '@/auth'
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

      {/* Same button as sign-in: with Google there is no separate registration
          step, so labelling it "sign up" would imply a distinction that does
          not exist. */}
      {googleEnabled ? (
        <div className="mb-6 space-y-6">
          <GoogleSignInButton label="Continue with Google" />
          <AuthDivider>or sign up with email</AuthDivider>
        </div>
      ) : null}

      <SignUpForm />
    </>
  )
}

export default page
