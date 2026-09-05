'use server'

import nodemailer from "nodemailer";
import { z } from "zod";

import { ContactSchema } from "@/validation";
import { CONTACT_EMAIL, REPLY_WINDOW } from "@/lib/site";

type ContactParams = z.infer<typeof ContactSchema>;

/**
 * Sends a contact enquiry to the store inbox.
 *
 * The payload is re-validated here: client-side validation is a convenience,
 * not a guarantee — a server action is a public endpoint and can be called
 * directly.
 */
export const sendContactMessage = async (params: ContactParams) => {
  const parsed = ContactSchema.safeParse(params);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please check the form",
    };
  }

  const { name, email, subject, message } = parsed.data;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  // Fail loudly rather than pretending the message was delivered — a silent
  // success here would lose real customer enquiries.
  if (!user || !pass) {
    console.error("[contact] SMTP_USER / SMTP_PASSWORD are not configured");
    return {
      success: false,
      message: "Messaging is temporarily unavailable. Please email us directly.",
    };
  }

  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: Number(process.env.SMTP_PORT ?? 465) === 465,
      auth: { user, pass },
    });

    await transport.sendMail({
      from: `"MythPets Contact" <${user}>`,
      to: CONTACT_EMAIL,
      // So hitting reply in the inbox goes to the customer, not to ourselves.
      replyTo: `"${name}" <${email}>`,
      subject: `[Contact] ${subject}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });

    return {
      success: true,
      message: `Message sent — we'll reply within ${REPLY_WINDOW}.`,
    };
  } catch (error) {
    console.error("[contact] send failed:", error);
    return {
      success: false,
      message: "Could not send your message. Please email us directly.",
    };
  }
};
