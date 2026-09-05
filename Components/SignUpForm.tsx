"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { SignInSchema, SignUpSchema } from "@/validation";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { SignIn, SignUp } from "@/lib/actions/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

const SignUpForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof SignUpSchema>>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      name: "",  
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof SignUpSchema>) => {
    const result = await SignUp({
      email: values.email,
      password: values.password,
      name: values.name,
    });
    if (result.success) {
      toast.success(result.message);
      redirect("/")
    } else {
      toast.error(result.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
         <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="joe"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>
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
          <FieldLabel htmlFor="password">Password</FieldLabel>
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
          {isSubmitting ? "Creating account..." : "Sign Up"}
        </Button>
         <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have account?{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:text-primary/80 transition-colors duration-150">
          Sign in
        </Link>
      </p>
      </FieldGroup>
    </form>
  );
};

export default SignUpForm;
