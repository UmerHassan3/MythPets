import { auth, googleEnabled } from '@/auth'
import SignInForm from '@/Components/SignInForm'
import GoogleSignInButton from '@/Components/GoogleSignInButton'
import AuthDivider from '@/Components/AuthDivider'
import { redirect } from 'next/navigation'

/** Only same-origin paths are honoured — an absolute URL here is an open redirect. */
const safeCallback = (value: string | string[] | undefined) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

const page = async ({ searchParams }: PageProps<"/sign-in">) => {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/")
  }

  const params = await searchParams;
  const callbackUrl = safeCallback(params.callbackUrl);

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

      {/* Offered first: for anyone who signed up with Google it is the only
          route in, and it saves everyone else a password. */}
      {googleEnabled ? (
        <div className="mb-6 space-y-6">
          <GoogleSignInButton callbackUrl={callbackUrl} />
          <AuthDivider>or sign in with email</AuthDivider>
        </div>
      ) : null}

      <SignInForm />
    </>
  )
}

export default page
