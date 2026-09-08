import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { CheckCircle2, Clock, Package } from "lucide-react";
import QRCode from "qrcode";

import { auth } from "@/auth";
import { db, withRetry } from "@/drizzle";
import { orderItems, orders } from "@/Database/schema";
import { formatPrice } from "@/lib/format";
import { Button } from "@/Components/ui/button";
import PaymentPanel from "@/Components/user/PaymentPanel";
import RecheckButton from "@/Components/user/RecheckButton";

/** Postgres throws on a malformed uuid, so reject it before querying. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const page = async ({ params }: PageProps<"/checkout/[orderid]">) => {
  const { orderid } = await params;

  if (!UUID_PATTERN.test(orderid)) {
    notFound();
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/checkout/${orderid}`);
  }

  // Scoped to the owner: an order id in the URL must not expose someone else's
  // order, payment address or Roblox username.
  const [order, items] = await Promise.all([
    withRetry(() =>
      db
        .select({
          id: orders.id,
          status: orders.status,
          total: orders.total,
          robloxUsername: orders.robloxUsername,
          paymentMethodName: orders.paymentMethodName,
          paymentNetwork: orders.paymentNetwork,
          paymentAddress: orders.paymentAddress,
          paymentAmount: orders.paymentAmount,
          paymentAsset: orders.paymentAsset,
          expiresAt: orders.expiresAt,
          verificationNote: orders.verificationNote,
          txHash: orders.txHash,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(and(eq(orders.id, orderid), eq(orders.userId, session.user.id)))
        .limit(1),
    ),
    withRetry(() =>
      db
        .select({
          id: orderItems.id,
          productName: orderItems.productName,
          unitPrice: orderItems.unitPrice,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderid))
        .orderBy(asc(orderItems.productName)),
    ),
  ]);

  if (order.length === 0) {
    notFound();
  }

  const current = order[0];
  const awaitingPayment = current.status === "pending";

  // Generated on the server so the QR library never reaches the client bundle.
  const qrPayload =
    current.paymentAsset === "LTC" && current.paymentAmount
      ? `litecoin:${current.paymentAddress}?amount=${current.paymentAmount}`
      : current.paymentAddress;

  const qrDataUrl = current.paymentAddress
    ? await QRCode.toDataURL(qrPayload!, {
        margin: 1,
        width: 320,
        errorCorrectionLevel: "M",
      })
    : "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <header className="border-b pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Order {current.id.slice(0, 8)}
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          {awaitingPayment ? "Complete your payment" : "Payment submitted"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Delivering to{" "}
          <span className="font-medium text-foreground">
            {current.robloxUsername}
          </span>{" "}
          in-game.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-start lg:gap-12">
        <section>
          {awaitingPayment && current.paymentAddress ? (
            <>
              <p className="mb-5 text-sm text-muted-foreground">
                Send the exact amount below to the address shown, then paste
                your transaction ID. We check it on the blockchain and confirm
                your order automatically.
              </p>

              <PaymentPanel
                orderId={current.id}
                address={current.paymentAddress}
                network={current.paymentNetwork ?? "the selected network"}
                amount={current.paymentAmount}
                asset={current.paymentAsset}
                expiresAt={current.expiresAt?.toISOString() ?? null}
                qrDataUrl={qrDataUrl}
              />
            </>
          ) : (
            /* Everything past `pending` is a waiting state for the customer —
               only an admin can move an order to paid or delivered. */
            <div className="space-y-4">
              <div className="flex gap-3 rounded-xl border bg-card p-5">
                {current.status === "delivered" ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                ) : (
                  <Clock className="mt-0.5 size-5 shrink-0 text-amber-500" />
                )}

                <div>
                  <p className="font-medium">
                    {current.status === "processing"
                      ? "Verifying your payment"
                      : current.status === "paid"
                        ? "Payment confirmed"
                        : current.status === "delivered"
                          ? "Delivered"
                          : "Order cancelled"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {current.status === "processing"
                      ? // The note carries the real reason — usually "waiting
                        // for confirmations", sometimes an amount mismatch.
                        (current.verificationNote ??
                          "We're checking your transaction on-chain.")
                      : current.status === "paid"
                        ? "We'll contact you in-game to hand the pets over."
                        : current.status === "delivered"
                          ? "This order has been handed over in-game."
                          : "Contact us if you believe this is a mistake."}
                  </p>

                  {current.status === "processing" ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your payment is safe. Confirmations take a minute or two —
                      check again below rather than sending anything else.
                    </p>
                  ) : null}
                </div>
              </div>

              {current.txHash ? (
                <div className="rounded-xl border bg-card p-5">
                  <p className="text-sm font-medium">Transaction ID</p>
                  <p className="mt-2 font-mono text-xs break-all text-muted-foreground">
                    {current.txHash}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {current.status === "processing" ? (
                  <RecheckButton orderId={current.id} />
                ) : null}

                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/adopt-me" />}
                >
                  Continue shopping
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-xl border bg-card p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
            <Package className="size-4 text-muted-foreground" />
            Order summary
          </h2>

          <ul className="mt-4 space-y-3 border-b pb-4">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="line-clamp-2">{item.productName}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    × {item.quantity}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatPrice(
                    String(Number(item.unitPrice) * item.quantity),
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-medium">Total</span>
            <span className="font-heading text-xl font-semibold tabular-nums">
              {formatPrice(current.total)}
            </span>
          </div>

          {current.paymentMethodName ? (
            <div className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
              <p>
                Paying with {current.paymentMethodName} ·{" "}
                {current.paymentNetwork}
              </p>
              {current.paymentAmount && current.paymentAsset !== "USDT" ? (
                <p className="tabular-nums">
                  Rate locked at {current.paymentAmount} {current.paymentAsset}
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
};

export default page;
