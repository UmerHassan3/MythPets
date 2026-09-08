import Link from "next/link";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { CircleCheck, ExternalLink, Gamepad2, Inbox } from "lucide-react";

import { db, withRetry } from "@/drizzle";
import { orderItems, orders } from "@/Database/schema";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import PageHeader from "@/Components/admin/PageHeader";
import EmptyState from "@/Components/admin/EmptyState";
import Pagination from "@/Components/user/Pagination";
import OrderStatusActions from "@/Components/admin/OrderStatusActions";
import type { OrderStatus } from "@/lib/actions/admin-actions/orders";
import { Badge } from "@/Components/ui/badge";

const PER_PAGE = 20;

const FILTERS = [
  { value: "", label: "All" },
  { value: "paid", label: "Ready to deliver" },
  { value: "processing", label: "Verifying" },
  { value: "pending", label: "Awaiting payment" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-amber-500/15 text-amber-700",
  paid: "bg-emerald-500/15 text-emerald-700",
  delivered: "bg-sky-500/15 text-sky-700",
  cancelled: "bg-destructive/10 text-destructive",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Deep-links the transaction for auditing. Verification itself happens on the
 * server when the customer submits — this is for looking at a disputed order,
 * not for deciding one.
 */
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

const page = async ({ searchParams }: PageProps<"/admin/orders">) => {
  const params = await searchParams;
  const requested = Math.max(1, Number(first(params.page)) || 1);
  const rawStatus = first(params.status) ?? "";
  const status = FILTERS.some((f) => f.value === rawStatus) ? rawStatus : "";

  const where = status ? eq(orders.status, status) : undefined;

  const [{ total }] = await withRetry(() =>
    db.select({ total: sql<number>`count(*)::int` }).from(orders).where(where),
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
            customerName: orders.customerName,
            customerEmail: orders.customerEmail,
            robloxUsername: orders.robloxUsername,
            paymentMethodName: orders.paymentMethodName,
            paymentNetwork: orders.paymentNetwork,
            paymentAmount: orders.paymentAmount,
            paymentAsset: orders.paymentAsset,
            txHash: orders.txHash,
            verifiedAmount: orders.verifiedAmount,
            verificationNote: orders.verificationNote,
            paidAt: orders.paidAt,
            createdAt: orders.createdAt,
          })
          .from(orders)
          .where(where)
          .orderBy(desc(orders.createdAt))
          .limit(PER_PAGE)
          .offset((current - 1) * PER_PAGE),
      )
    : [];

  // One query for every line on this page, grouped in memory. Fetching items
  // per order would be 20 extra round-trips.
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
    <>
      <PageHeader
        title="Orders"
        description={total === 1 ? "1 order" : `${total} orders`}
      />

      {/* Links rather than a client-side filter: each view is a shareable URL
          and costs no JavaScript. */}
      <nav aria-label="Filter orders" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = status === filter.value;

          return (
            <Link
              key={filter.value || "all"}
              href={
                filter.value
                  ? `/admin/orders?status=${filter.value}`
                  : "/admin/orders"
              }
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-foreground bg-foreground font-medium text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={status ? "No orders in this state" : "No orders yet"}
          description={
            status
              ? "Try a different filter."
              : "Orders appear here as soon as customers check out."
          }
        />
      ) : (
        <>
          <ul className="space-y-4">
            {rows.map((order) => {
              const lines = itemsByOrder.get(order.id) ?? [];
              const explorer = order.txHash
                ? explorerUrl(order.paymentNetwork, order.txHash)
                : null;

              return (
                <li
                  key={order.id}
                  className="overflow-hidden rounded-xl border bg-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b bg-muted/40 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {order.id.slice(0, 8)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            STATUS_STYLES[order.status as OrderStatus],
                          )}
                        >
                          {order.status}
                        </span>
                        <time
                          dateTime={order.createdAt.toISOString()}
                          className="text-xs text-muted-foreground"
                        >
                          {dateFormat.format(order.createdAt)}
                        </time>
                      </div>

                      {/* The single most important field on the page: without
                          it the order cannot be delivered. */}
                      <p className="mt-2 flex items-center gap-1.5 font-medium">
                        <Gamepad2 className="size-4 shrink-0 text-red-600" />
                        {order.robloxUsername}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {order.customerName} · {order.customerEmail}
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

                    <div className="space-y-2 text-sm">
                      {order.paymentMethodName ? (
                        <p className="text-muted-foreground">
                          {order.paymentMethodName} · {order.paymentNetwork}
                          {order.paymentAmount ? (
                            <span className="tabular-nums">
                              {" "}
                              · {order.paymentAmount} {order.paymentAsset}
                            </span>
                          ) : null}
                        </p>
                      ) : null}

                      {order.txHash ? (
                        <div className="space-y-1.5">
                          {/* Verified by the server, not by whoever is reading
                              this page — shown so a dispute can be traced. */}
                          {order.verifiedAmount ? (
                            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <CircleCheck className="size-3.5 shrink-0" />
                              Verified on-chain
                              {order.paidAt ? (
                                <time dateTime={order.paidAt.toISOString()}>
                                  · {dateFormat.format(order.paidAt)}
                                </time>
                              ) : null}
                            </p>
                          ) : order.verificationNote ? (
                            <p className="text-xs text-amber-700">
                              {order.verificationNote}
                            </p>
                          ) : null}

                          <p className="font-mono text-xs break-all text-muted-foreground">
                            {order.txHash}
                          </p>

                          {explorer ? (
                            <a
                              href={explorer}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                            >
                              View on explorer
                              <ExternalLink className="size-3" />
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        <Badge variant="secondary">No transaction yet</Badge>
                      )}
                    </div>
                  </div>

                  <div className="border-t p-4">
                    <OrderStatusActions
                      orderId={order.id}
                      status={order.status as OrderStatus}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination
            page={current}
            totalPages={totalPages}
            basePath="/admin/orders"
            query={status ? { status } : undefined}
          />
        </>
      )}
    </>
  );
};

export default page;
