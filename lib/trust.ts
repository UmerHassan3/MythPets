import { ShieldCheck, Truck, Zap } from "lucide-react";

/**
 * The three promises the brand leads with. Defined once because they appear in
 * the footer, the product page and the homepage — three copies would drift the
 * first time the wording changed.
 */
export const TRUST_POINTS = [
  {
    icon: Truck,
    title: "In-game delivery",
    text: "A real trader meets you in Adopt Me and hands the pet over directly.",
    short: "In-game delivery",
  },
  {
    icon: ShieldCheck,
    title: "Never asks for your password",
    text: "We will never request your Roblox login. Not once, for any reason.",
    short: "Password never required",
  },
  {
    icon: Zap,
    title: "Live stock, instant checkout",
    text: "Everything listed is in stock right now — no waiting on restocks.",
    short: "Instant checkout",
  },
] as const;
