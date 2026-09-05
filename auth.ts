import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { users } from "./Database/schema";
import { db, withRetry } from "./drizzle";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,

  session: {
    strategy: "jwt",
  },

  providers: [
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
    async jwt({ token, user }) {
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