"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gamepad2,
  LayoutDashboard,
  LogOut,
  PenIcon,
  Receipt,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SignOut } from "@/lib/actions/auth";
import { Button } from "@/Components/ui/button";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/games", label: "Games", icon: Gamepad2 },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
   { href: "/admin/manage-reviews", label: "Manage Reviews", icon: PenIcon },
] as const;

type AdminSidebarProps = {
  name?: string | null;
  email?: string | null;
};

/**
 * Client-only because it reads the active pathname. Everything else in the
 * admin shell stays a Server Component, so this is the entire JS cost of the
 * chrome.
 */
const AdminSidebar = ({ name, email }: AdminSidebarProps) => {
  const pathname = usePathname();

  const signOutButton = (
    <form action={SignOut}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground"
      >
        <LogOut className="size-4" />
        Sign out
      </Button>
    </form>
  );

  return (
    <aside className="flex flex-col border-b bg-muted/30 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3 md:px-5 md:py-5">
        <Link
          href="/admin/dashboard"
          className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Image
            src="/Images/Icon.jpeg"
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-lg object-cover ring-1 ring-border"
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-heading text-sm font-semibold">
              MythPets
            </p>
            <p className="truncate text-xs text-muted-foreground">Admin</p>
          </div>
        </Link>

        {/* Mobile only: the desktop footer block is off-screen here, so without
            this an admin on a phone has no way to sign out. */}
        <form action={SignOut} className="md:hidden">
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            className="text-muted-foreground"
          >
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>

      <nav
        aria-label="Admin"
        className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-x-visible"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          // Sub-routes such as /admin/games/[gameid] keep "Games" active.
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t p-3 md:block">
        {name || email ? (
          <div className="mb-2 min-w-0 px-2 py-1">
            {name ? (
              <p className="truncate text-sm font-medium">{name}</p>
            ) : null}
            {email ? (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            ) : null}
          </div>
        ) : null}

        {signOutButton}
      </div>
    </aside>
  );
};

export default AdminSidebar;
