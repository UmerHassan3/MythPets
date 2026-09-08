"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Timer } from "lucide-react";

import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ResetPasswordSchema } from "@/validation";
import { resetPassword } from "@/lib/actions/password-reset";
import { RESET_TTL_LABEL } from "@/lib/site";

/** m:ss remaining, so the window is visible rather than a surprise. */
const countdown = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const ResetPasswordForm = ({
  token,
  expiresAt,
}: {
  token: string;
  /** ISO timestamp the server verified this link is good until. */
  expiresAt: string;
}) => {
  const router = useRouter();
  const [remaining, setRemaining] = useState(
    () => new Date(expiresAt).getTime() - Date.now(),
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof ResetPasswordSchema>>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Counts down from the server's timestamp rather than a duration, so a slow
  // page load or a backgrounded tab cannot make the window look longer.
  useEffect(() => {
    const deadline = new Date(expiresAt).getTime();
    const timer = setInterval(() => setRemaining(deadline - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const expired = remaining <= 0;

  const onSubmit = async (values: z.infer<typeof ResetPasswordSchema>) => {
    const result = await resetPassword({
      token,
      password: values.password,
      confirmPassword: values.confirmPassword,
    });

    if (result.success) {
      toast.success(result.message);
      router.push("/sign-in");
      router.refresh();
    } else {
      toast.error(result.message);
      // An expired or spent link cannot be retried, so send them back to ask
      // for a new one rather than leaving a form that will only fail again.
      if (result.message.includes("expired")) {
        router.push("/forgot-password");
      }
    }
  };

  if (expired) {
    return (
      <div className="space-y-5">
        <div className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
          <Timer className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-700">This link has expired</p>
            <p className="mt-1 text-amber-700/80">
              Reset links last {RESET_TTL_LABEL}. Nothing has changed on your
              account — request a new one and open it soon.
            </p>
          </div>
        </div>

        <Button
          nativeButton={false}
          render={<Link href="/forgot-password" />}
          className="w-full"
        >
          Request a new link
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
          <Timer className="size-3.5 shrink-0" />
          This link expires in {countdown(remaining)}
        </p>

        <Field>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="min 8 characters"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="type it again"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Updating..." : "Update password"}
        </Button>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Changed your mind?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-primary transition-colors duration-150 hover:text-primary/80"
          >
            Back to sign in
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
};

export default ResetPasswordForm;
