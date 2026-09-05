import Image from "next/image";
import Link from "next/link";

import { auth } from "@/auth";
import HeaderNav, { type NavItem } from "./HeaderNav";

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/adopt-me", label: "Adopt Me" },
  { href: "/reviews", label: "Reviews" },
  { href: "/contact", label: "Contact" },
];

/**
 * Server Component: the session is read here, so no auth state is fetched from
 * the browser and no loading flicker appears. Only the interactive parts —
 * active-link highlighting and the mobile toggle — cross into `HeaderNav`.
 */
const Header = async () => {
  const session = await auth();

  const user = session?.user?.id
    ? {
        name: session.user.name ?? null,
        isAdmin: session.user.role === "admin",
      }
    : null;

  return (
    <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur supports-backdrop-filter:bg-white/75">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 md:px-6">
        <Link
          href="/"
          aria-label="MythPets — home"
          className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
        >
          {/* Light-theme mark: transparent PNG generated from Logo.jpeg with the
              black plate removed and the white artwork darkened, so it reads on
              a white bar. The original white-on-black version is unreadable
              here — see Logo.jpeg for the dark-surface original. */}
          <Image
            src="/Images/Logo-light.png"
            alt="MythPets"
            width={440}
            height={337}
            priority
            className="h-10 w-auto"
          />
        </Link>

        <HeaderNav items={NAV_ITEMS} user={user} />
      </div>
    </header>
  );
};

export default Header;
