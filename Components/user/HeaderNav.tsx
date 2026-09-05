"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Shield, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/Components/ui/button";
import { SignOut } from "@/lib/actions/auth";
import AvatarDropdown, { ACCOUNT_LINKS } from "./AvatarDropdown";

export type NavItem = { href: string; label: string };

type HeaderNavProps = {
  items: readonly NavItem[];
  /** Null when signed out — the server resolves this, not the client. */
  user: { name: string | null; isAdmin: boolean } | null;
};

/**
 * The only client component in the header. It exists for two things the server
 * cannot do: highlight the active route and toggle the mobile panel. Session
 * state arrives as props, already resolved on the server.
 */
const HeaderNav = ({ items, user }: HeaderNavProps) => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const close = () => setOpen(false);

  const navLinks = (variant: "bar" | "panel") =>
    items.map(({ href, label }) => {
      const active = isActive(href);

      return (
        <Link
          key={href}
          href={href}
          onClick={close}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative text-sm transition-colors",
            variant === "bar"
              ? "px-3 py-2"
              : "rounded-lg px-3 py-2.5 hover:bg-muted",
            active
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
          {/* Underline marker reads cleaner at this height than a filled pill,
              and keeps the row visually level. */}
          {variant === "bar" && active ? (
            <span
              aria-hidden
              className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-red-600"
            />
          ) : null}
        </Link>
      );
    });

  const account = (variant: "bar" | "panel") =>
    user ? (
      variant === "panel" ? (
        /* Mobile: the panel is already an open sheet, so a dropdown inside it
           would be a floating menu within a menu. Render the same account
           links flat as full-width rows instead. */
        <div className="space-y-1">
          {user.name ? (
            <p className="truncate px-3 pb-2 text-sm font-medium">
              {user.name}
            </p>
          ) : null}

          {user.isAdmin ? (
            <Link
              href="/admin/dashboard"
              onClick={close}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Shield className="size-4 shrink-0" />
              Admin
            </Link>
          ) : null}

          {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}

          <form action={SignOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {user.isAdmin ? (
            <Button
              size="sm"
              variant="ghost"
              nativeButton={false}
              render={<Link href="/admin/dashboard" onClick={close} />}
              className="gap-1.5"
            >
              <Shield className="size-4" />
              Admin
            </Button>
          ) : null}

          {user.name ? (
            <span className="hidden max-w-32 truncate text-sm text-muted-foreground xl:inline">
              {user.name}
            </span>
          ) : null}

          <AvatarDropdown />
        </div>
      )
    ) : (
      <div
        className={cn(
          "flex items-center gap-2",
          variant === "panel" && "flex-col items-stretch",
        )}
      >
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          render={<Link href="/sign-in" onClick={close} />}
          className={cn(variant === "panel" && "w-full")}
        >
          Sign in
        </Button>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/sign-up" onClick={close} />}
          className={cn(
            "bg-red-600 text-white hover:bg-red-500",
            variant === "panel" && "w-full",
          )}
        >
          Get started
        </Button>
      </div>
    );

  return (
    <>
      <nav
        aria-label="Main"
        className="hidden flex-1 items-center justify-center gap-1 md:flex"
      >
        {navLinks("bar")}
      </nav>

      <div className="hidden shrink-0 md:flex">{account("bar")}</div>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="md:hidden"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open ? (
        <div className="absolute inset-x-0 top-full border-b bg-white p-4 shadow-lg md:hidden">
          <nav aria-label="Main" className="flex flex-col gap-1">
            {navLinks("panel")}
          </nav>
          <div className="mt-4 border-t pt-4">{account("panel")}</div>
        </div>
      ) : null}
    </>
  );
};

export default HeaderNav;
