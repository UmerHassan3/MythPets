import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { checkResetToken } from "@/lib/actions/password-reset";
import ResetPasswordForm from "@/Components/ResetPasswordForm";
import { Button } from "@/Components/ui/button";
import { RESET_TTL_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Reset password — MythPets",
  robots: { index: false, follow: false },
};

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const page = async ({ searchParams }: PageProps<"/reset-password">) => {
  const token = first((await searchParams).token) ?? "";

  // Checked here, on load, rather than on submit. People still land on dead
  // links whatever the window is, and finding out after typing and
  // confirming a new password is a wasted round trip. Read-only — this does
  // not consume the token.
  const { valid, expiresAt } = await checkResetToken(token);

  if (!valid || !expiresAt) {
    return (
      <>
        <div className="mb-8 space-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Link no longer valid
          </h1>
        </div>

        <div className="space-y-5">
          <div className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-700">
                This reset link has expired or has already been used
              </p>
              <p className="mt-1 text-amber-700/80">
                Links last {RESET_TTL_LABEL} and work only once. Your password
                hasn&apos;t changed — request a new link and open it soon.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              render={<Link href="/forgot-password" />}
            >
              Request a new link
            </Button>
            <Button
              nativeButton={false}
              variant="ghost"
              render={<Link href="/sign-in" />}
            >
              Back to sign in
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-8 space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Set a new password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose something you haven&apos;t used elsewhere. You&apos;ll be signed
          in with it next time.
        </p>
      </div>

      <ResetPasswordForm token={token} expiresAt={expiresAt} />
    </>
  );
};

export default page;
