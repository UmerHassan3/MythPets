"use server";

import { signOut } from "@/auth";

export const Signout = async () => {
  await signOut({
    redirectTo: "/",
  });
};