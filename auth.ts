import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { after } from "next/server";

import { users } from "./Database/schema";
import { db, withRetry } from "./drizzle";
import { sendMail } from "./lib/email/mailer";
import { welcomeEmail } from "./lib/email/templates";

/** Postgres unique_violation — two sign-ins racing to create the same account. */
const UNIQUE_VIOLATION = "23505";

const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID;
// Accepts the shorter name used in .env as well as the conventional one.
const GOOGLE_SECRET =
  process.env.GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

export const googleEnabled = Boolean(GOOGLE_ID && GOOGLE_SECRET);

/**
 * Finds or creates the account behind a verified Google identity.
 *
 * Matching is on email, which is only safe because `signIn` below refuses any
 * Google profile whose address Google has not verified — otherwise anyone could
 * claim any address by putting it in a profile.
 */
const upsertGoogleUser = async (email: string, name: string) => {
  const existing = await withRetry(() =>
    db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.email, email))
      .limit(1),
  );

  // Existing account, whether it was created with a password or with Google.
  // Signing in this way never alters the password already on the row.
  if (existing.length > 0) return existing[0];

  try {
    const [created] = await db
      .insert(users)
      .values({
        name,
        email,
        // No password: this account cannot be signed into with one, which
        // `authorize` enforces explicitly below.
        password: null,
        role: "user",
      })
      .returning({ id: users.id, name: users.name, role: users.role });

    // A Google sign-up is still a sign-up, so it gets the same welcome message.
    // `after` runs it once the OAuth redirect has been sent rather than making
    // the customer wait on SMTP.
    try {
      after(async () => {
        await sendMail({ to: email, ...welcomeEmail(name) });
      });
    } catch {
      // `after` needs a request scope. Never let a missing one break sign-in.
    }

    return created;
  } catch (error) {
    // Two tabs finishing the OAuth dance at once: the loser re-reads the row
    // the winner just inserted rather than failing the sign-in.
    if ((error as { code?: string })?.code === UNIQUE_VIOLATION) {
      const [row] = await db
        .select({ id: users.id, name: users.name, role: users.role })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (row) return row;
    }

    throw error;
  }
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,

  session: {
    strategy: "jwt",
  },

  providers: [
    // Registered only when configured, so a missing secret is a hidden button
    // rather than a crash on every request.
    ...(googleEnabled
      ? [
          Google({
            clientId: GOOGLE_ID,
            clientSecret: GOOGLE_SECRET,
            authorization: {
              // Always offer the account chooser. Without this, anyone with
              // several Google accounts is silently signed into the last one.
              params: { prompt: "select_account" },
            },
          }),
        ]
      : []),

    Credentials({
      name: "Credentials",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      authorize: async (credentials) => {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) {
          return null;
        }

        // Read-only, so it is safe to retry through a dropped connection.
        const result = await withRetry(() =>
          db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              password: users.password,
              role: users.role,
            })
            .from(users)
            .where(eq(users.email, email))
            .limit(1),
        );

        if (result.length === 0) {
          return null;
        }

        const dbuser = result[0];

        // A null password means the account was created through Google and has
        // no password to check. Rejected here, before bcrypt: `compare` throws
        // on a null hash rather than returning false, and an account without a
        // password must never be reachable through this provider.
        if (!dbuser.password) {
          return null;
        }

        const isPasswordValid = await compare(
          password,
          dbuser.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: dbuser.id,
          name: dbuser.name,
          email: dbuser.email,
          role: dbuser.role,
        };
      },
    }),
  ],

  pages: {
    signIn: "/sign-in",
  },

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;

      // Google must vouch for the address before it is used to find an account.
      // An unverified address in a profile proves nothing about who owns it.
      return Boolean(profile?.email_verified && profile.email);
    },

    async jwt({ token, user, account, profile }) {
      // Google only supplies a profile on the sign-in request itself; later
      // calls just refresh an existing token and must not re-query.
      if (account?.provider === "google" && profile?.email) {
        const row = await upsertGoogleUser(
          profile.email,
          (profile.name as string) || profile.email.split("@")[0],
        );

        token.id = row.id;
        token.name = row.name;
        token.role = row.role;

        return token;
      }

      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
      }

      return session;
    },
  },
});
