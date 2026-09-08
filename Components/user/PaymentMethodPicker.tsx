"use client";

import { Check, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PaymentMethodOption } from "@/lib/actions/user-actions/order";

type PaymentMethodPickerProps = {
  methods: PaymentMethodOption[];
  value: string;
  onChange: (id: string) => void;
};

/**
 * Radio group styled as cards. Real inputs rather than clickable divs, so
 * arrow keys move between options and screen readers announce the group.
 */
const PaymentMethodPicker = ({
  methods,
  value,
  onChange,
}: PaymentMethodPickerProps) => {
  if (methods.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
        No payment methods available right now.
      </p>
    );
  }

  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-2 text-sm font-medium">Payment method</legend>

      {methods.map((method) => {
        const selected = value === method.id;

        return (
          <label
            key={method.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
              selected
                ? "border-foreground bg-muted/60"
                : "hover:bg-muted/40",
              // Focus lives on the visually-hidden input, so mirror it here.
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
            )}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method.id}
              checked={selected}
              onChange={() => onChange(method.id)}
              className="sr-only"
            />

            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted"
            >
              <Wallet className="size-4 text-muted-foreground" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{method.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {method.network}
              </span>
            </span>

            {selected ? (
              <Check aria-hidden className="size-4 shrink-0 text-foreground" />
            ) : null}
          </label>
        );
      })}
    </fieldset>
  );
};

export default PaymentMethodPicker;
