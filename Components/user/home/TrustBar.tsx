import { TRUST_POINTS } from "@/lib/trust";

/**
 * Sits directly under the hero. A first-time buyer's question is "is this
 * safe?", so the answer goes above the products rather than only in the footer.
 *
 * Server Component — static markup, no JavaScript.
 */
const TrustBar = () => (
  <section
    aria-label="Why buy from MythPets"
    className="border-b bg-muted/40"
  >
    <ul className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 md:px-6">
      {TRUST_POINTS.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-600/10">
            <Icon className="size-4 text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {text}
            </p>
          </div>
        </li>
      ))}
    </ul>
  </section>
);

export default TrustBar;
