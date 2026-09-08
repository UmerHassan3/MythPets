/**
 * Static site constants.
 *
 * Kept out of the `'use server'` action file: those may only export async
 * functions, so a plain constant there fails the build.
 */
export const CONTACT_EMAIL = "mythpetsofficials@gmail.com";

/**
 * How long a password reset link stays valid.
 *
 * The expiry and every sentence that quotes it derive from this one value:
 * the email, both forms, and the dead-link page. Hard-coding the number in the
 * copy is how it ends up saying one thing while the server does another.
 */
export const RESET_TTL_MINUTES = 10;

export const RESET_TTL_LABEL = `${RESET_TTL_MINUTES} minutes`;

/** Quoted in the contact page and the confirmation toast — keep them in step. */
export const REPLY_WINDOW = "2–3 hours";
