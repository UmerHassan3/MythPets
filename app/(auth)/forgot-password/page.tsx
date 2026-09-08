import type { Metadata } from "next";

import ForgotPasswordForm from "@/Components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password — MythPets",
  // A reset page has no business in search results.
  robots: { index: false, follow: false },
};

const page = () => (
  <>
    <div className="mb-8 space-y-2">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Forgot your password?
      </h1>
      <p className="text-sm text-muted-foreground">
        Enter the email on your account and we&apos;ll send a link to set a new
        password.
      </p>
    </div>

    <ForgotPasswordForm />
  </>
);

export default page;
