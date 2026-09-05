import type { Metadata } from "next";
import { Clock, Mail, ShieldCheck, Truck } from "lucide-react";

import ContactForm from "@/Components/user/ContactForm";
import { CONTACT_EMAIL, REPLY_WINDOW } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact — MythPets",
  description:
    "Questions about an order, stock or delivery? Message the MythPets team and we'll reply within 2–3 hours.",
};

const ASSURANCES = [
  {
    icon: Truck,
    title: "Delivery help",
    text: "Trades are completed in-game. Tell us your Roblox username and we'll arrange a time.",
  },
  {
    icon: ShieldCheck,
    title: "Account safety",
    text: "We will never ask for your password or login details — not once, for any reason.",
  },
] as const;

const page = () => {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <div className="max-w-2xl">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Contact us
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Questions about stock, an order, or a delivery? Send us a message and
          a real person will get back to you.
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
        {/* Contact details */}
        <div className="space-y-8">
          {/* The response promise is the single most reassuring thing on this
              page, so it gets the strongest treatment. */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-600/10">
                <Clock className="size-4 text-red-600" />
              </div>
              <div>
                <p className="font-medium">Replies in {REPLY_WINDOW}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We answer every message during working hours, usually much
                  sooner.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Email us directly
            </h2>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-3 inline-flex items-center gap-2 rounded text-base font-medium outline-none hover:underline focus-visible:underline"
            >
              <Mail className="size-4 shrink-0 text-red-600" />
              {CONTACT_EMAIL}
            </a>
          </div>

          <dl className="space-y-6 border-t pt-8">
            {ASSURANCES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-red-600" />
                <div>
                  <dt className="text-sm font-medium">{title}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{text}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* Form */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
          <ContactForm />
        </div>
      </div>
    </div>
  );
};

export default page;
