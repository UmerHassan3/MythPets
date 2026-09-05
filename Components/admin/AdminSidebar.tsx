"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, LayoutDashboard, LogOut, PawPrint } from "lucide-react";

import { cn } from "@/lib/utils";
import { SignOut } from "@/lib/actions/auth";
import { Button } from "@/Components/ui/button";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/games", label: "Games", icon: Gamepad2 },
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

  return (
    <aside className="flex flex-col border-b bg-muted/30 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
      <div className="flex items-center gap-2 px-4 py-4 md:px-5 md:py-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <PawPrint className="size-4" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-heading text-sm font-semibold">MythPets</p>
          <p className="truncate text-xs text-muted-foreground">Admin</p>
        </div>
      </div>

      <nav
        aria-label="Admin"
        className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-x-visible md:px-3"
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
      </div>
    </aside>
  );
};

export default AdminSidebar;
