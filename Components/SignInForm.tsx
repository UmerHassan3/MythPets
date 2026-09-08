"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { SignInSchema } from "@/validation";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { SignIn } from "@/lib/actions/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

/** Only same-origin paths are honoured — an absolute URL here is an open redirect. */
const safeCallback = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/";

const SignInForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof SignInSchema>>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof SignInSchema>) => {
    const result = await SignIn({
      email: values.email,
      password: values.password,
    });
    if (result.success) {
      toast.success(result.message);
      // Back to whatever they were trying to reach, else home.
      router.push(callbackUrl);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="example@gmail.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="min 8 characters"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>
         <p className="mt-5 text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/sign-up" className="font-medium text-primary hover:text-primary/80 transition-colors duration-150">
          Create one free
        </Link>
      </p>
      </FieldGroup>
    </form>
  );
};

export default SignInForm;
