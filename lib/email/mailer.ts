// Server-only: holds SMTP credentials and must never reach the browser.

import nodemailer, { type Transporter } from "nodemailer";

import { CONTACT_EMAIL } from "@/lib/site";

/**
 * Outbound email.
 *
 * The governing rule here is that **email is never allowed to break a flow**.
 * A welcome message failing must not fail a registration, and an admin alert
 * failing must not stop a verified payment being recorded. Every send is
 * therefore best-effort: it reports success, logs failure, and never throws.
 */

const HOST = process.env.SMTP_HOST ?? "smtp.gmail.com";
const PORT = Number(process.env.SMTP_PORT ?? 465);
const USER = process.env.SMTP_USER;
// Google shows app passwords grouped as "abcd efgh ijkl mnop", so they are
// almost always pasted with spaces — which Gmail then rejects. Stripping
// whitespace here means a copy-paste straight from Google just works.
const PASS = process.env.SMTP_PASS?.replace(/s+/g, "");

/**
 * Where "new order" alerts go.
 *
 * Defaults to the public contact address rather than repeating it. Holding the
 * same address as two literals is what let the contact page and the alerts
 * point at different mailboxes.
 */
export const ADMIN_ALERT_EMAIL =
  process.env.ADMIN_ALERT_EMAIL ?? CONTACT_EMAIL;

/** Display name on outgoing mail. Falls back to the authenticated mailbox. */
const FROM = process.env.MAIL_FROM ?? (USER ? `MythPets <${USER}>` : undefined);

const isConfigured = Boolean(USER && PASS);

// Reused across dev HMR reloads and between requests on a warm lambda, so the
// SMTP connection and its TLS handshake are not rebuilt for every message.
const globalForMail = globalThis as unknown as { transporter?: Transporter };

const getTransporter = (): Transporter | null => {
  if (!isConfigured) return null;
  if (globalForMail.transporter) return globalForMail.transporter;

  globalForMail.transporter = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    // 465 is implicit TLS; 587 upgrades with STARTTLS.
    secure: PORT === 465,
    auth: { user: USER, pass: PASS },
    // A hung SMTP dialogue must not hold a serverless function open.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    // One connection serving several messages, rather than one each.
    pool: true,
    maxConnections: 2,
  });

  return globalForMail.transporter;
};

type Mail = {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Without one, spam filters score a message worse. */
  text: string;
  replyTo?: string;
};

/**
 * Sends one message. Resolves `false` rather than throwing on any failure.
 *
 * Callers are expected to ignore the result outside of logging — nothing a
 * customer does should depend on our mail server being reachable.
 */
export const sendMail = async (mail: Mail): Promise<boolean> => {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      `[email] SMTP not configured — skipped "${mail.subject}" to ${mail.to}`,
    );
    return false;
  }

  try {
    await transporter.sendMail({ from: FROM, ...mail });
    return true;
  } catch (error) {
    console.error(`[email] failed to send "${mail.subject}":`, error);
    return false;
  }
};

/** Verifies credentials without sending anything. Used by the check script. */
export const verifyMailer = async (): Promise<
  { ok: true } | { ok: false; reason: string }
> => {
  const transporter = getTransporter();

  if (!transporter) {
    return { ok: false, reason: "SMTP_USER / SMTP_PASS are not set in .env" };
  }

  try {
    await transporter.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }
};
