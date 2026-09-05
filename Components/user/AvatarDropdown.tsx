"use client";

import Link from "next/link";
import { LogOut, ShoppingCart, User, Package } from "lucide-react";

import { Avatar, AvatarFallback } from "@/Components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";
import { SignOut } from "@/lib/actions/auth";

/**
 * Shared with the mobile panel in `HeaderNav`, which renders these flat rather
 * than in a dropdown — one source so the two menus cannot drift apart.
 */
export const ACCOUNT_LINKS = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: Package },
] as const;

const AvatarDropdown = () => {
  return (
    <DropdownMenu>
      {/* Base UI uses `render`, not Radix's `asChild`. */}
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        }
      >
        <Avatar className="size-8">
          <AvatarFallback>
            <User className="size-4" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} render={<Link href={href} />}>
            <Icon className="size-4" />
            {label}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* A server action needs a real form submit, so the item renders as the
            submit button rather than wrapping one. */}
        <form action={SignOut}>
          <DropdownMenuItem
            variant="destructive"
            nativeButton
            render={<button type="submit" className="w-full" />}
            closeOnClick={false}
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AvatarDropdown;
