import { CreditCard, MessageCircle, MousePointerClick } from "lucide-react";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "Pick your pet",
    text: "Browse live stock and add what you want to your cart.",
  },
  {
    icon: CreditCard,
    title: "Checkout",
    text: "Pay securely. You'll get an order confirmation straight away.",
  },
  {
    icon: MessageCircle,
    title: "Meet in-game",
    text: "We contact you to arrange the trade and hand the pet over in Adopt Me.",
  },
] as const;

/**
 * Three steps, numbered. First-time buyers of in-game items mostly hesitate
 * because they do not know how delivery works — this answers that before they
 * reach the checkout.
 *
 * Server Component — static markup, no JavaScript.
 */
const HowItWorks = () => (
  <section aria-labelledby="how-it-works" className="border-t bg-muted/40">
    <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
      <div className="max-w-xl">
        <h2
          id="how-it-works"
          className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          How it works
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Three steps from picking a pet to holding it in-game.
        </p>
      </div>

      <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
        {STEPS.map(({ icon: Icon, title, text }, index) => (
          <li key={title} className="relative">
            {/* Connector between steps on wide screens — implies sequence
                without a heavy stepper component. */}
            {index < STEPS.length - 1 ? (
              <span
                aria-hidden
                className="absolute top-5 left-[calc(2.5rem+0.75rem)] hidden h-px w-[calc(100%-3.25rem)] bg-border sm:block"
              />
            ) : null}

            <div className="flex items-center gap-3">
              <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border bg-background">
                <Icon className="size-4 text-red-600" />
              </div>
              <span className="text-xs font-semibold tracking-wider text-muted-foreground tabular-nums uppercase">
                Step {index + 1}
              </span>
            </div>

            <p className="mt-4 font-medium">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {text}
            </p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default HowItWorks;
