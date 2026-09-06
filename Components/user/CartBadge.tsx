"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { useCart } from "@/lib/cart/cart-context";

/**
 * Cart entry point in the header. The count renders only after hydration —
 * localStorage is unavailable on the server, so rendering it eagerly would
 * cause a mismatch and a flash of the wrong number.
 */
const CartBadge = () => {
  const { count, hydrated } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
      className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <ShoppingCart className="size-5" />

      {hydrated && count > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
};

export default CartBadge;
