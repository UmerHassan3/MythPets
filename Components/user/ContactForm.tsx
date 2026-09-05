"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Send } from "lucide-react";

import { ContactSchema } from "@/validation";
import { sendContactMessage } from "@/lib/actions/user-actions/contact";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Textarea } from "@/Components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/Components/ui/field";

type ContactValues = z.infer<typeof ContactSchema>;

/**
 * The only client component on the page — everything else is static and
 * server-rendered.
 */
const ContactForm = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(ContactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const onSubmit = async (values: ContactValues) => {
    const result = await sendContactMessage(values);

    if (result.success) {
      toast.success(result.message);
      reset();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="contact-name">Name</FieldLabel>
            <Input
              id="contact-name"
              autoComplete="name"
              placeholder="Your name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="contact-email">Email</FieldLabel>
            <Input
              id="contact-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="contact-subject">Subject</FieldLabel>
          <Input
            id="contact-subject"
            placeholder="Order #1234 — delivery question"
            aria-invalid={!!errors.subject}
            {...register("subject")}
          />
          <FieldError errors={[errors.subject]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="contact-message">Message</FieldLabel>
          <Textarea
            id="contact-message"
            rows={6}
            placeholder="Tell us what you need help with…"
            aria-invalid={!!errors.message}
            {...register("message")}
          />
          <FieldDescription>
            Include your Roblox username and order number if you have one — it
            helps us reply faster.
          </FieldDescription>
          <FieldError errors={[errors.message]} />
        </Field>

        <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2">
          <Send className="size-4" />
          {isSubmitting ? "Sending…" : "Send message"}
        </Button>
      </FieldGroup>
    </form>
  );
};

export default ContactForm;
