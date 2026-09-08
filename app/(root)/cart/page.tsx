"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  ImageOff,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { useCart } from "@/lib/cart/cart-context";
import {
  getCartProducts,
  type CartProduct,
} from "@/lib/actions/user-actions/cart";
import {
  createOrder,
  getPaymentMethods,
  type PaymentMethodOption,
} from "@/lib/actions/user-actions/order";
import { formatPrice, priceInfo } from "@/lib/format";
import PaymentMethodPicker from "@/Components/user/PaymentMethodPicker";
import { Button } from "@/Components/ui/button";
import { TRUST_POINTS } from "@/lib/trust";
import { CheckoutSchema } from "@/validation";
import { Input } from "@/Components/ui/input";

const CartPage = () => {
  const { items, hydrated, setQuantity, remove, clear } = useCart();
  const [products, setProducts] = useState<CartProduct[] | null>(null);
  const [robloxUsername, setRobloxUsername] = useState("");
  // Errors only appear once the field has been interacted with, so an empty
  // cart page does not open covered in red.
  const [robloxTouched, setRobloxTouched] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [methodId, setMethodId] = useState("");
  const [placing, setPlacing] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Ids are the only thing persisted, so the live rows are fetched here. The
  // key is the id list rather than `items` so changing a quantity does not
  // trigger a refetch.
  const idKey = useMemo(
    () =>
      items
        .map((item) => item.id)
        .sort()
        .join(","),
    [items],
  );

  useEffect(() => {
    if (!hydrated) return;

    if (!idKey) {
      setProducts([]);
      return;
    }

    let cancelled = false;

    startTransition(async () => {
      const rows = await getCartProducts(idKey.split(","));
      if (!cancelled) setProducts(rows);
    });

    return () => {
      cancelled = true;
    };
  }, [idKey, hydrated]);

  // Loaded once on mount rather than per render: the list is small, static,
  // and needed before the customer can check out.
  useEffect(() => {
    let cancelled = false;

    getPaymentMethods().then((rows) => {
      if (cancelled) return;
      setMethods(rows);
      // Preselect so the common case is one click, not two.
      setMethodId((current) => current || rows[0]?.id || "");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Join the persisted quantities onto the live rows. Anything that no longer
  // resolves has been deactivated or deleted and is reported below.
  const lines = useMemo(() => {
    if (!products) return [];

    return items.flatMap((item) => {
      const product = products.find((row) => row.id === item.id);
      if (!product) return [];

      const { effective, onSale } = priceInfo(product.price, product.salesPrice);
      const unit = Number(effective);
      // Stock may have dropped since the item was added.
      const quantity = Math.min(item.quantity, Math.max(product.stock, 0));

      return [{ ...product, quantity, unit, onSale, lineTotal: unit * quantity }];
    });
  }, [items, products]);

  const unavailable = products
    ? items.length - lines.filter((line) => line.quantity > 0).length
    : 0;

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const loading = !hydrated || products === null;

  // Validated before checkout rather than after payment: a typo here means a
  // paid order we cannot deliver.
  const usernameError =
    robloxTouched && !CheckoutSchema.safeParse({ robloxUsername }).success
      ? CheckoutSchema.safeParse({ robloxUsername }).error?.issues[0]?.message
      : null;

  const handleCheckout = async () => {
    const parsed = CheckoutSchema.safeParse({ robloxUsername });

    if (!parsed.success) {
      setRobloxTouched(true);
      toast.error("Roblox username required", {
        description: parsed.error.issues[0]?.message,
      });
      return;
    }

    if (!methodId) {
      toast.error("Choose a payment method");
      return;
    }

    setPlacing(true);

    // Only ids and quantities are sent — the server re-reads every price, so
    // nothing here can influence what the order costs.
    const result = await createOrder({
      items: lines.map((line) => ({ id: line.id, quantity: line.quantity })),
      robloxUsername: parsed.data.robloxUsername,
      paymentMethodId: methodId,
    });

    if (result.success && result.orderId) {
      // The cart is deliberately left intact until the payment is submitted:
      // the order snapshots its own items, but an abandoned checkout should
      // not leave the customer with nothing.
      router.push(`/checkout/${result.orderId}`);
      return;
    }

    toast.error(result.message);
    setPlacing(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="border-b pb-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Your cart
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {loading
            ? "Loading your items…"
            : lines.length === 0
              ? "Nothing here yet."
              : `${lines.length} ${lines.length === 1 ? "item" : "items"}`}
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading your cart…
        </div>
      ) : lines.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="size-5 text-muted-foreground" />
          </div>
          <p className="font-heading text-lg font-semibold">Your cart is empty</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Browse the catalogue and add a pet to get started.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/adopt-me" />}
            className="mt-2"
          >
            Browse pets
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-12">
          {/* Lines */}
          <section aria-label="Cart items" className="space-y-4">
            {unavailable > 0 ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
                {unavailable} {unavailable === 1 ? "item is" : "items are"} no
                longer available and {unavailable === 1 ? "was" : "were"}{" "}
                removed from your total.
              </p>
            ) : null}

            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {lines.map((line) => (
                <li key={line.id} className="flex gap-4 p-4">
                  <Link
                    href={`/products/${line.id}`}
                    className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border"
                  >
                    {line.image ? (
                      <Image
                        src={line.image}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center">
                        <ImageOff className="size-5 text-muted-foreground" />
                      </span>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/products/${line.id}`}
                          className="line-clamp-2 text-sm font-medium hover:underline"
                        >
                          {line.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                          {formatPrice(String(line.unit))} each
                        </p>
                      </div>

                      <p className="shrink-0 font-heading text-base font-semibold tabular-nums">
                        {formatPrice(String(line.lineTotal))}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Quantity stepper */}
                      <div className="flex items-center rounded-lg border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Decrease quantity of ${line.name}`}
                          disabled={line.quantity <= 1}
                          onClick={() =>
                            setQuantity(line.id, line.quantity - 1, line.stock)
                          }
                        >
                          <Minus className="size-3.5" />
                        </Button>

                        <span
                          aria-live="polite"
                          className="w-8 text-center text-sm tabular-nums"
                        >
                          {line.quantity}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Increase quantity of ${line.name}`}
                          disabled={line.quantity >= line.stock}
                          onClick={() =>
                            setQuantity(line.id, line.quantity + 1, line.stock)
                          }
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>

                      {line.quantity >= line.stock ? (
                        <span className="text-xs text-amber-600">
                          Max {line.stock} in stock
                        </span>
                      ) : null}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          remove(line.id);
                          toast.success(`${line.name} removed`);
                        }}
                        className="ml-auto gap-1.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex justify-between">
              <Button
                nativeButton={false}
                variant="ghost"
                size="sm"
                render={<Link href="/adopt-me" />}
              >
                Continue shopping
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  clear();
                  toast.success("Cart cleared");
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                Clear cart
              </Button>
            </div>
          </section>

          {/* Summary — sticky on desktop so checkout stays reachable in a long
              cart. */}
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="font-heading text-lg font-semibold">Summary</h2>

              <dl className="mt-4 space-y-2 border-b pb-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">
                    {formatPrice(String(subtotal))}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery</dt>
                  <dd className="text-muted-foreground">In-game</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="font-medium">Total</span>
                <span className="font-heading text-2xl font-semibold tabular-nums">
                  {formatPrice(String(subtotal))}
                </span>
              </div>

              {/* Delivery is an in-game trade, so this is the single piece of
                  information the order cannot be fulfilled without. It sits
                  above the button rather than behind it. */}
              <div className="mt-5 space-y-1.5">
                <label
                  htmlFor="roblox-username"
                  className="text-sm font-medium"
                >
                  Roblox username
                </label>
                <Input
                  id="roblox-username"
                  value={robloxUsername}
                  onChange={(event) => setRobloxUsername(event.target.value)}
                  onBlur={() => setRobloxTouched(true)}
                  placeholder="e.g. MythPetsTrader"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={!!usernameError}
                  aria-describedby="roblox-username-hint"
                />
                {usernameError ? (
                  <p className="text-xs text-destructive">{usernameError}</p>
                ) : (
                  <p
                    id="roblox-username-hint"
                    className="text-xs text-muted-foreground"
                  >
                    We deliver in-game — make sure this is exact.
                  </p>
                )}
              </div>

              <div className="mt-5">
                <PaymentMethodPicker
                  methods={methods}
                  value={methodId}
                  onChange={setMethodId}
                />
              </div>

              <Button
                type="button"
                size="lg"
                disabled={placing || methods.length === 0}
                onClick={handleCheckout}
                className="mt-4 w-full"
              >
                {placing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating order…
                  </>
                ) : (
                  "Checkout"
                )}
              </Button>

              <ul className="mt-5 space-y-2 border-t pt-5">
                {TRUST_POINTS.map(({ icon: Icon, short }) => (
                  <li
                    key={short}
                    className="flex items-center gap-2.5 text-xs text-muted-foreground"
                  >
                    <Icon className="size-3.5 shrink-0 text-red-600" />
                    {short}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default CartPage;
