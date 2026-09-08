"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, MailCheck } from "lucide-react";

import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ForgotPasswordSchema } from "@/validation";
import { requestPasswordReset } from "@/lib/actions/password-reset";
import { RESET_TTL_LABEL } from "@/lib/site";

const ForgotPasswordForm = () => {
  // Once a request goes through the form is replaced entirely. Leaving it on
  // screen invites a second submission, which only invalidates the link the
  // first one just sent.
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: z.infer<typeof ForgotPasswordSchema>) => {
    const result = await requestPasswordReset(values.email);

    if (result.success) {
      toast.success(result.message);
      setSentTo(values.email);
    } else {
      toast.error(result.message);
    }
  };

  if (sentTo) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3 rounded-xl border bg-card p-5">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div className="min-w-0 text-sm">
            <p className="font-medium">Check your inbox</p>
            <p className="mt-1 break-all text-muted-foreground">
              If <span className="font-medium text-foreground">{sentTo}</span>{" "}
              has an account, a reset link is on its way.
            </p>
            <p className="mt-2 text-muted-foreground">
              It expires in{" "}
              <strong className="text-foreground">{RESET_TTL_LABEL}</strong>.
              Check your spam folder if it hasn&apos;t arrived.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSentTo(null)}
          >
            Send another link
          </Button>

          <Button
            nativeButton={false}
            variant="ghost"
            render={<Link href="/sign-in" />}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" />
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="example@gmail.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Sending..." : "Send reset email"}
        </Button>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
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

export default ForgotPasswordForm;
