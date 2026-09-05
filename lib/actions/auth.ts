'use server'

import { signIn, signOut } from "@/auth";
import { db } from "@/drizzle";
import { users } from "@/Database/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm/sql/expressions/conditions";

type AuthParams = {
  name: string;
  email: string;
  password: string;
}

export const SignUp = async(params:AuthParams) => {
    const { name, email, password } = params;

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

    const loginUser = await SignIn({ email, password });
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

/**
 * Clears the session cookie and returns to sign-in.
 *
 * Because the session strategy is `jwt`, claims like `role` are frozen into the
 * cookie at sign-in. Changing a user's role in the database only takes effect
 * once they sign out and back in.
 */
export const SignOut = async () => {
    await signOut({ redirectTo: "/sign-in" });
}