import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  ArrowRight,
  ExternalLink,
  Gamepad2,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

import { auth } from "@/auth";
import { db, withRetry } from "@/drizzle";
import { orderItems, orders, users } from "@/Database/schema";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SignOut } from "@/lib/actions/auth";
import { Button } from "@/Components/ui/button";

export const metadata: Metadata = {
  title: "Your profile — MythPets",
};

/**
 * The statuses that mean money actually changed hands.
 *
 * `pending` and `processing` are unfinished, and `cancelled` never completed —
 * none of them belong in a history of what somebody has bought.
 */
const SUCCESSFUL = ["paid", "delivered"] as const;

/** Recent purchases only. The full, paginated history lives at /orders. */
const RECENT_LIMIT = 5;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Up to two initials, so long names do not overflow the avatar. */
const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

const explorerUrl = (network: string | null, hash: string) => {
  if (!network) return null;
  if (/bep-?20|bnb|bsc/i.test(network)) return `https://bscscan.com/tx/${hash}`;
  if (/litecoin|ltc/i.test(network)) {
    return `https://blockchair.com/litecoin/transaction/${hash}`;
  }
  return null;
};

const page = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/profile");
  }

  const userId = session.user.id;
  const owned = and(
    eq(orders.userId, userId),
    inArray(orders.status, [...SUCCESSFUL]),
  );

  // Four independent reads in one round-trip of latency instead of four.
  const [account, [summary], [{ pets }], recent] = await Promise.all([
    // Read from the table rather than the session: the JWT freezes `role` at
    // sign-in, so a promoted account would show the stale value here.
    withRetry(() =>
      db
        .select({ name: users.name, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
    ),

    // Counted and summed in Postgres. Fetching the rows to length them in JS
    // would transfer the whole history to total three numbers.
    withRetry(() =>
      db
        .select({
          count: sql<number>`count(*)::int`,
          spent: sql<string>`coalesce(sum(${orders.total}), 0)`,
        })
        .from(orders)
        .where(owned),
    ),

    withRetry(() =>
      db
        .select({ pets: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int` })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(owned),
    ),

    withRetry(() =>
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
        .limit(RECENT_LIMIT),
    ),
  ]);

  // One query for every line on the page, grouped in memory — asking per order
  // would be five extra round-trips.
  const items = recent.length
    ? await withRetry(() =>
        db
          .select({
            orderId: orderItems.orderId,
            productName: orderItems.productName,
            unitPrice: orderItems.unitPrice,
            quantity: orderItems.quantity,
          })
          .from(orderItems)
          .where(inArray(orderItems.orderId, recent.map((row) => row.id)))
          .orderBy(asc(orderItems.productName)),
      )
    : [];

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  // The table is the source of truth; the session covers a deleted-account edge.
  const name = account[0]?.name ?? session.user.name ?? "Your account";
  const email = account[0]?.email ?? session.user.email ?? "";
  const isAdmin = account[0]?.role === "admin";

  const stats = [
    { label: "Completed orders", value: String(summary.count), icon: PackageCheck },
    { label: "Total spent", value: formatPrice(summary.spent), icon: ShoppingBag },
    { label: "Pets received", value: String(pets), icon: Gamepad2 },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <header className="border-b pb-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Your profile
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account details and everything you&apos;ve bought.
        </p>
      </header>

      {/* Identity */}
      <section aria-label="Account details" className="mt-8">
        <div className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <span
            aria-hidden
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-red-600/10 font-heading text-xl font-semibold text-red-700 ring-1 ring-red-600/20"
          >
            {initialsOf(name)}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-xl font-semibold tracking-tight">
                {name}
              </h2>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                  <ShieldCheck className="size-3" />
                  Admin
                </span>
              ) : null}
            </div>

            {/* Long addresses must wrap rather than widen the card. */}
            <p className="mt-1 text-sm break-all text-muted-foreground">
              {email}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {isAdmin ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/admin/dashboard" />}
              >
                Admin panel
              </Button>
            ) : null}

            <form action={SignOut}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Stats. A definition list because that is what these are — a label and
          its value — which also gives screen readers the pairing for free. */}
      <section aria-label="Purchase summary" className="mt-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border bg-card p-4 shadow-sm">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3.5 shrink-0" />
                {label}
              </dt>
              <dd className="mt-1.5 font-heading text-2xl font-semibold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Previous orders */}
      <section aria-label="Previous orders" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Previous orders
          </h2>

          {/* Only offered when there is more to see than is shown here. */}
          {summary.count > RECENT_LIMIT ? (
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              View all {summary.count}
              <ArrowRight className="size-3.5" />
            </Link>
          ) : null}
        </div>

        {recent.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-5 text-muted-foreground" />
            </div>
            <p className="font-heading text-lg font-semibold">
              No completed orders yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Once a payment is confirmed, the order appears here. Anything
              still awaiting payment stays in your orders list.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button nativeButton={false} render={<Link href="/adopt-me" />}>
                Browse pets
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/orders" />}
              >
                All orders
              </Button>
            </div>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {recent.map((order) => {
              const lines = itemsByOrder.get(order.id) ?? [];
              const delivered = order.status === "delivered";
              const explorer = order.txHash
                ? explorerUrl(order.paymentNetwork, order.txHash)
                : null;

              return (
                <li
                  key={order.id}
                  className="overflow-hidden rounded-xl border bg-card shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/40 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            delivered
                              ? "bg-sky-500/15 text-sky-700"
                              : "bg-emerald-500/15 text-emerald-700",
                          )}
                        >
                          {delivered ? "Delivered" : "Payment confirmed"}
                        </span>
                        <time
                          dateTime={order.createdAt.toISOString()}
                          className="text-xs text-muted-foreground"
                        >
                          {dateFormat.format(order.createdAt)}
                        </time>
                      </div>

                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Order {order.id.slice(0, 8)} · delivered to{" "}
                        <span className="font-medium text-foreground">
                          {order.robloxUsername}
                        </span>
                      </p>
                    </div>

                    <p className="shrink-0 font-heading text-lg font-semibold tabular-nums">
                      {formatPrice(order.total)}
                    </p>
                  </div>

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

                      {explorer ? (
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
        )}
      </section>
    </div>
  );
};

export default page;
