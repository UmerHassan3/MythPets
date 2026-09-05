import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Truck, Zap } from "lucide-react";

/**
 * Link groups live in data rather than markup, so a new column or entry is a
 * one-line change and every link renders identically.
 */
const LINK_GROUPS = [
  {
    heading: "Shop",
    links: [
      { href: "/adopt-me", label: "Adopt Me" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/reviews", label: "Reviews" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/profile", label: "Profile" },
      { href: "/cart", label: "Cart" },
      { href: "/orders", label: "Orders" },
    ],
  },
] as const;

const TRUST_POINTS = [
  { icon: Truck, text: "In-game delivery" },
  { icon: ShieldCheck, text: "Password never required" },
  { icon: Zap, text: "Instant checkout" },
] as const;

/**
 * Server Component — the footer is static chrome, so it ships no JavaScript.
 * The year is computed at render time rather than hardcoded.
 */
const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="space-y-4">
            <Link
              href="/"
              aria-label="MythPets — home"
              className="inline-block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
            >
              {/* The original logo is white artwork on black, so it needs no
                  treatment on this dark surface — unlike the header, which
                  uses the recoloured light variant. */}
              <Image
                src="/Images/Logo.jpeg"
                alt="MythPets"
                width={1280}
                height={976}
                className="h-12 w-auto"
              />
            </Link>

            <p className="max-w-xs text-sm leading-relaxed text-white/55">
              Buy Roblox Adopt Me pets at fair prices, delivered in-game by a
              real trader. Live stock, no account sharing.
            </p>

            <ul className="space-y-2 pt-1">
              {TRUST_POINTS.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-2.5 text-xs text-white/50"
                >
                  <Icon className="size-3.5 shrink-0 text-red-500" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          {LINK_GROUPS.map(({ heading, links }) => (
            <nav key={heading} aria-labelledby={`footer-${heading}`}>
              <h2
                id={`footer-${heading}`}
                className="text-xs font-semibold tracking-wider text-white/40 uppercase"
              >
                {heading}
              </h2>

              <ul className="mt-4 space-y-3">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="rounded text-sm text-white/70 transition-colors outline-none hover:text-white focus-visible:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/40">
            © {year} MythPets. All rights reserved.
          </p>

          <div className="flex gap-2 text-xs text-white/40">
            <Link
            href={'/privacy-policy'}>Privacy Policy</Link>
            <Link
            href={'/terms-of-service'}>Terms of Service</Link>
            <Link
            href={'/refund-policy'}>Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
