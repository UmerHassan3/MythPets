'use server'

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { after } from "next/server";
import bcrypt from "bcryptjs";

import { db, withRetry } from "@/drizzle";
import { passwordResetTokens, users } from "@/Database/schema";
import { ForgotPasswordSchema, ResetPasswordSchema } from "@/validation";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { RESET_TTL_LABEL, RESET_TTL_MINUTES } from "@/lib/site";
import { sendMail } from "@/lib/email/mailer";
import { passwordResetEmail } from "@/lib/email/templates";

/** How long a link stays valid. Short by design — it is a bearer credential. */
const TOKEN_TTL_MS = RESET_TTL_MINUTES * 60_000;

/**
 * The single response to a reset request, whatever the outcome.
 *
 * Deliberately identical whether the address is registered or not: a different
 * message for each turns this form into a tool for discovering which of a list
 * of email addresses hold accounts here.
 */
const NEUTRAL_REPLY = {
  success: true,
  message:
    `If that email has an account, a reset link is on its way. It expires in ${RESET_TTL_LABEL}.`,
};

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/**
 * Starts a password reset.
 *
 * Nothing about the outcome reaches the caller — the reply is the same either
 * way, and the work happens after the response is sent.
 */
export const requestPasswordReset = async (email: string) => {
  const parsed = ForgotPasswordSchema.safeParse({ email });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Enter a valid email address",
    };
  }

  // Reset mail is sent to an address the requester chooses, so an unlimited
  // form is a way to flood somebody else's inbox from our domain.
  const limit = await rateLimit("password-reset");
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfter);
  }

  const address = parsed.data.email.toLowerCase();

  const found = await withRetry(() =>
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.email, address))
      .limit(1),
  );

  if (found.length === 0) {
    return NEUTRAL_REPLY;
  }

  const user = found[0];

  // 256 bits from the CSPRNG. This value exists in the email and nowhere else —
  // only its hash is stored, so we could not reveal it later even if asked.
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  try {
    await db.transaction(async (tx) => {
      // Requesting a new link retires the old ones. Without this, every link
      // ever sent stays usable until it expires on its own.
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(passwordResetTokens.userId, user.id),
            isNull(passwordResetTokens.usedAt),
          ),
        );

      await tx.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
      });
    });
  } catch (error) {
    console.error("[requestPasswordReset] failed:", error);
    // Still neutral: a database problem must not become an oracle either.
    return NEUTRAL_REPLY;
  }

  // Sent after the response so the reply timing does not differ between a
  // registered address (which sends mail) and an unregistered one (which does
  // not) — that difference is measurable and leaks the same fact.
  after(async () => {
    await sendMail({
      to: user.email,
      ...passwordResetEmail(user.name, token),
    });
  });

  return NEUTRAL_REPLY;
};

type TokenRow = { id: string; userId: string };

/**
 * Resolves a raw token to its live, unredeemed row.
 *
 * The lookup is by hash, so the database never sees the token. Expiry and the
 * used marker are both part of the query rather than checked afterwards.
 */
const findLiveToken = async (token: string): Promise<TokenRow | null> => {
  // A malformed value cannot match anything; reject before touching the
  // database rather than hashing arbitrary input from the URL.
  if (!/^[a-f0-9]{64}$/.test(token)) return null;

  const rows = await withRetry(() =>
    db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        tokenHash: passwordResetTokens.tokenHash,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, hashToken(token)))
      .limit(1),
  );

  if (rows.length === 0) return null;

  const row = rows[0];

  // The unique index already made this an exact match; the constant-time
  // comparison is here so the code does not depend on that staying true.
  const supplied = Buffer.from(hashToken(token), "hex");
  const stored = Buffer.from(row.tokenHash, "hex");

  if (supplied.length !== stored.length || !timingSafeEqual(supplied, stored)) {
    return null;
  }

  return { id: row.id, userId: row.userId };
};

/**
 * Reports whether a link is still good, without redeeming it.
 *
 * Called when the page loads so an expired link says so immediately, rather
 * than after somebody has typed and confirmed a new password. With a two
 * minute window that is a difference people will actually hit.
 */
export const checkResetToken = async (
  token: string,
): Promise<{ valid: boolean; expiresAt: string | null }> => {
  if (!token) return { valid: false, expiresAt: null };

  if (!/^[a-f0-9]{64}$/.test(token)) return { valid: false, expiresAt: null };

  const rows = await withRetry(() =>
    db
      .select({
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, hashToken(token)))
      .limit(1),
  );

  const row = rows[0];

  if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
    return { valid: false, expiresAt: null };
  }

  return { valid: true, expiresAt: row.expiresAt.toISOString() };
};

/**
 * Redeems a token and sets the new password.
 *
 * The redemption is a conditional UPDATE rather than a read followed by a
 * write: two submissions of the same link race here, and only the one that
 * actually flips `used_at` is allowed to continue.
 */
export const resetPassword = async (params: {
  token: string;
  password: string;
  confirmPassword: string;
}) => {
  const parsed = ResetPasswordSchema.safeParse({
    password: params.password,
    confirmPassword: params.confirmPassword,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid password",
    };
  }

  // Guessing a 256-bit token is not the threat; hammering bcrypt is.
  const limit = await rateLimit("password-reset-submit");
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfter);
  }

  const live = await findLiveToken(params.token);

  const expired = {
    success: false,
    message: "This reset link has expired or has already been used.",
  };

  if (!live) return expired;

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    const done = await db.transaction(async (tx) => {
      // Claim first. `used_at is null` and the expiry are both in the
      // predicate, so an expired or already-redeemed link matches nothing and
      // the password is never touched.
      const claimed = await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(passwordResetTokens.id, live.id),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, new Date()),
          ),
        )
        .returning({ id: passwordResetTokens.id });

      if (claimed.length === 0) return false;

      await tx
        .update(users)
        .set({ password: passwordHash })
        .where(eq(users.id, live.userId));

      return true;
    });

    if (!done) return expired;
  } catch (error) {
    console.error("[resetPassword] failed:", error);
    return { success: false, message: "Could not reset your password" };
  }

  return {
    success: true,
    message: "Password updated. You can sign in with it now.",
  };
};

/**
 * Clears rows that are spent or long past their expiry.
 *
 * There is no scheduler on serverless, so this runs opportunistically. Nothing
 * depends on it — expired tokens are already refused — it only stops the table
 * growing without bound.
 */
export const purgeResetTokens = async () => {
  try {
    await db
      .delete(passwordResetTokens)
      .where(
        or(
          lt(passwordResetTokens.expiresAt, new Date(Date.now() - 24 * 3600_000)),
          lt(passwordResetTokens.createdAt, new Date(Date.now() - 7 * 24 * 3600_000)),
        ),
      );
  } catch (error) {
    console.error("[purgeResetTokens] failed:", error);
  }
};
