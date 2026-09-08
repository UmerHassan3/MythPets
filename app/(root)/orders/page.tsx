import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { ExternalLink, Package, ShoppingBag } from "lucide-react";

import { auth } from "@/auth";
import { db, withRetry } from "@/drizzle";
import { orderItems, orders } from "@/Database/schema";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/Components/ui/button";
import Pagination from "@/Components/user/Pagination";

export const metadata: Metadata = {
  title: "Your orders — MythPets",
};

const PER_PAGE = 10;

type OrderStatus =
  | "pending"
  | "processing"
  | "paid"
  | "delivered"
  | "cancelled";

/** The customer-facing story of each state — not the raw database word. */
const STATUS_COPY: Record<OrderStatus, { label: string; hint: string; tone: string }> = {
  pending: {
    label: "Awaiting payment",
    hint: "Send the payment to complete this order.",
    tone: "bg-muted text-muted-foreground",
  },
  processing: {
    label: "Verifying payment",
    hint: "We're checking your transaction on-chain.",
    tone: "bg-amber-500/15 text-amber-700",
  },
  paid: {
    label: "Payment confirmed",
    hint: "We'll contact you in-game to hand the pets over.",
    tone: "bg-emerald-500/15 text-emerald-700",
  },
  delivered: {
    label: "Delivered",
    hint: "Traded in-game. Thanks for your order.",
    tone: "bg-sky-500/15 text-sky-700",
  },
  cancelled: {
    label: "Cancelled",
    hint: "Get in touch if you think this is a mistake.",
    tone: "bg-destructive/10 text-destructive",
  },
};

/** The happy path, for the progress track. Cancelled sits outside it. */
const TRACK: OrderStatus[] = ["pending", "processing", "paid", "delivered"];

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const explorerUrl = (network: string | null, hash: string) => {
  if (!network) return null;
  if (/bep-?20|bnb|bsc/i.test(network)) return `https://bscscan.com/tx/${hash}`;
  if (/litecoin|ltc/i.test(network)) {
    return `https://blockchair.com/litecoin/transaction/${hash}`;
  }
  return null;
};

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const page = async ({ searchParams }: PageProps<"/orders">) => {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/orders");
  }

  const params = await searchParams;
  const requested = Math.max(1, Number(first(params.page)) || 1);

  // Every query is scoped to the signed-in user — an order id is never enough
  // to see someone else's purchase.
  const owned = eq(orders.userId, session.user.id);

  const [{ total }] = await withRetry(() =>
    db.select({ total: sql<number>`count(*)::int` }).from(orders).where(owned),
  );

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const current = Math.min(requested, totalPages);

  const rows = total
    ? await withRetry(() =>
        db
          .select({
            id: orders.id,
            status: orders.status,
            total: orders.total,
            robloxUsername: orders.robloxUsername,
            paymentMethodName: orders.paymentMethodName,
            paymentNetwork: orders.paymentNetwork,
            txHash: orders.txHash,
            createdAt: orders.createdAt,
          })
          .from(orders)
          .where(owned)
          .orderBy(desc(orders.createdAt))
          .limit(PER_PAGE)
          .offset((current - 1) * PER_PAGE),
      )
    : [];

  // One query for every line on this page, grouped in memory — fetching items
  // per order would be ten extra round-trips.
  const items = rows.length
    ? await withRetry(() =>
        db
          .select({
            orderId: orderItems.orderId,
            productName: orderItems.productName,
            unitPrice: orderItems.unitPrice,
            quantity: orderItems.quantity,
          })
          .from(orderItems)
          .where(inArray(orderItems.orderId, rows.map((row) => row.id)))
          .orderBy(asc(orderItems.productName)),
      )
    : [];

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <header className="border-b pb-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Your orders
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {total === 0
            ? "You haven't placed an order yet."
            : `${total} ${total === 1 ? "order" : "orders"}`}
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="size-5 text-muted-foreground" />
          </div>
          <p className="font-heading text-lg font-semibold">No orders yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            When you buy a pet it'll appear here, with its delivery status.
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
        <>
          <ul className="mt-8 space-y-4">
            {rows.map((order) => {
              const status = order.status as OrderStatus;
              const copy = STATUS_COPY[status];
              const lines = itemsByOrder.get(order.id) ?? [];
              const stepIndex = TRACK.indexOf(status);
              const explorer = order.txHash
                ? explorerUrl(order.paymentNetwork, order.txHash)
                : null;

              return (
                <li
                  key={order.id}
                  className="overflow-hidden rounded-xl border bg-card shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/40 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            copy.tone,
                          )}
                        >
                          {copy.label}
                        </span>
                        <time
                          dateTime={order.createdAt.toISOString()}
                          className="text-xs text-muted-foreground"
                        >
                          {dateFormat.format(order.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Order {order.id.slice(0, 8)} · delivering to{" "}
                        <span className="font-medium text-foreground">
                          {order.robloxUsername}
                        </span>
                      </p>
                    </div>

                    <p className="shrink-0 font-heading text-lg font-semibold tabular-nums">
                      {formatPrice(order.total)}
                    </p>
                  </div>

                  {/* Progress track. Cancelled orders leave the happy path, so
                      the track is replaced by the explanation alone. */}
                  {stepIndex >= 0 ? (
                    <div className="flex gap-1 px-4 pt-4" aria-hidden>
                      {TRACK.map((step, index) => (
                        <span
                          key={step}
                          className={cn(
                            "h-1 flex-1 rounded-full",
                            index <= stepIndex ? "bg-red-600" : "bg-muted",
                          )}
                        />
                      ))}
                    </div>
                  ) : null}

                  <p className="px-4 pt-2 text-sm text-muted-foreground">
                    {copy.hint}
                  </p>

                  <div className="grid gap-4 p-4 sm:grid-cols-2">
                    <ul className="space-y-1.5 text-sm">
                      {lines.map((line, index) => (
                        <li
                          key={`${order.id}-${index}`}
                          className="flex justify-between gap-3"
                        >
                          <span className="min-w-0">
                            <span className="line-clamp-1">
                              {line.productName}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              × {line.quantity}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {formatPrice(
                              String(Number(line.unitPrice) * line.quantity),
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="space-y-2 text-sm sm:text-right">
                      {order.paymentMethodName ? (
                        <p className="text-xs text-muted-foreground">
                          {order.paymentMethodName} · {order.paymentNetwork}
                        </p>
                      ) : null}

                      {status === "pending" ? (
                        <Button
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/checkout/${order.id}`} />}
                        >
                          Complete payment
                        </Button>
                      ) : explorer ? (
                        <a
                          href={explorer}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                        >
                          View transaction
                          <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-10">
            <Pagination
              page={current}
              totalPages={totalPages}
              basePath="/orders"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default page;
