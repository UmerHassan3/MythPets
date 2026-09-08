'use server'

import { signIn, signOut } from "@/auth";
import { db } from "@/drizzle";
import { users } from "@/Database/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm/sql/expressions/conditions";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { after } from "next/server";
import { sendMail } from "@/lib/email/mailer";
import { welcomeEmail } from "@/lib/email/templates";

type AuthParams = {
  name: string;
  email: string;
  password: string;
}

/**
 * Establishes the session. Deliberately not rate limited itself.
 *
 * Registration signs the new account in as its final step, so the limit lives
 * on the two entry points below rather than here — otherwise one registration
 * would spend two of the caller's ten attempts.
 */
const authenticate = async (email: string, password: string) => {
    try{
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });
        if(result?.error){
            return {
                success: false,
                message: "Incorrect email or password"
            }
        }
        return{
            success: true,
            message: "Signed in successfully"
        }
    }
    catch (error) {
        return {
            success: false,
            message: "Error occurred while signing in"
        }
    }
}

export const SignUp = async(params:AuthParams) => {
    const { name, email, password } = params;

    // Checked before any work happens: hashing a password is deliberately slow,
    // so letting an unlimited number of requests reach it is itself the attack.
    const limit = await rateLimit("signup");
    if (!limit.allowed) {
        return tooManyRequests(limit.retryAfter);
    }

    const checkUser = await db.select().from(users).where(eq(users.email, email));

    if (checkUser.length > 0) {
        return {
            success: false,
            message: "User already exists"
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try{
        await db.insert(users).values({
        name,
        email,
        password: hashedPassword,
    }).returning();
    }
    catch (error) {
        return {
            success: false,
            message: "Error creating user"
        }
    }

    // Queued rather than awaited: SMTP takes seconds, and nobody should wait
    // on a welcome message to finish registering. `after` runs this once the
    // response has been sent while keeping the function alive to complete it —
    // a bare floating promise would be killed when the lambda freezes.
    after(async () => {
      await sendMail({ to: email, ...welcomeEmail(name) });
    });

    const loginUser = await authenticate(email, password);
    if(!loginUser.success){
        return loginUser

    }
    return {
        success: true,
        message: "User created successfully",
    }


}

export const SignIn = async(params: { email: string, password: string }) => {
    const { email, password } = params;

    // Ten attempts a minute per client. Guessing a password needs far more
    // than that, and nobody signing in legitimately needs anywhere near it.
    const limit = await rateLimit("signin");
    if (!limit.allowed) {
        return tooManyRequests(limit.retryAfter);
    }

    return authenticate(email, password);
}

/**
 * Clears the session cookie and returns to sign-in.
 *
 * Because the session strategy is `jwt`, claims like `role` are frozen into the
 * cookie at sign-in. Changing a user's role in the database only takes effect
 * once they sign out and back in.
 */
/**
 * Starts the Google OAuth flow.
 *
 * Takes FormData so the button can be a plain `<form action={...}>` and works
 * without any client-side JavaScript.
 */
export const SignInWithGoogle = async (formData: FormData) => {
    const requested = formData.get("callbackUrl");

    // Re-checked on the server. The form field is client-supplied, so trusting
    // it would let a crafted sign-in link bounce someone to another site
    // carrying a freshly issued session.
    const callbackUrl =
        typeof requested === "string" &&
        requested.startsWith("/") &&
        !requested.startsWith("//")
            ? requested
            : "/";

    await signIn("google", { redirectTo: callbackUrl });
}

export const SignOut = async () => {
    await signOut({ redirectTo: "/sign-in" });
}
