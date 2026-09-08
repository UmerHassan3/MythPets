'use server'

import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db, withRetry } from "@/drizzle";
import { orderItems, orders, paymentMethods, products } from "@/Database/schema";
import { CheckoutSchema } from "@/validation";
import { priceInfo } from "@/lib/format";
import { verifyPayment } from "@/lib/payments/verify";
import { quotePayment } from "@/lib/payments/rates";
import { after } from "next/server";
import { ADMIN_ALERT_EMAIL, sendMail } from "@/lib/email/mailer";
import { newOrderEmail } from "@/lib/email/templates";

export type PaymentMethodOption = {
  id: string;
  code: string;
  name: string;
  network: string;
};

/** Postgres unique_violation — a transaction hash already claimed elsewhere. */
const UNIQUE_VIOLATION = "23505";

/**
 * How many hashes may be submitted against one order.
 *
 * Generous enough that a customer correcting a typo is never blocked, low
 * enough that nobody can sit there feeding us hashes copied off the explorer.
 */
const MAX_ATTEMPTS = 10;

/** Customer-facing list. Addresses are deliberately withheld until an order exists. */
export const getPaymentMethods = async (): Promise<PaymentMethodOption[]> =>
  withRetry(() =>
    db
      .select({
        id: paymentMethods.id,
        code: paymentMethods.code,
        name: paymentMethods.name,
        network: paymentMethods.network,
      })
      .from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
      .orderBy(paymentMethods.sortOrder),
  );

/**
 * Expires abandoned orders and returns their stock.
 *
 * Stock is held from the moment an order is created, so something has to give
 * it back when the customer never pays. There is no scheduler on serverless,
 * so this runs opportunistically before a new order is created — the one
 * moment the answer actually matters.
 *
 * `stockReleased` makes it idempotent: two requests sweeping at once, or a
 * sweep racing an admin cancellation, cannot return the same stock twice.
 */
export const releaseExpiredOrders = async () => {
  try {
    await db.transaction(async (tx) => {
      const stale = await tx
        .update(orders)
        .set({ status: "cancelled", stockReleased: true, updatedAt: new Date() })
        .where(
          and(
            eq(orders.status, "pending"),
            eq(orders.stockReleased, false),
            lt(orders.expiresAt, new Date()),
          ),
        )
        .returning({ id: orders.id });

      if (stale.length === 0) return;

      const lines = await tx
        .select({
          productId: orderItems.productId,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(inArray(orderItems.orderId, stale.map((row) => row.id)));

      for (const line of lines) {
        if (!line.productId) continue;

        await tx
          .update(products)
          .set({ stock: sql`${products.stock} + ${line.quantity}` })
          .where(eq(products.id, line.productId));
      }
    });
  } catch (error) {
    // Never block a checkout because housekeeping failed.
    console.error("[releaseExpiredOrders] failed:", error);
  }
};

type CreateOrderParams = {
  items: { id: string; quantity: number }[];
  robloxUsername: string;
  paymentMethodId: string;
};

/**
 * Creates a pending order and reserves its stock.
 *
 * Prices, stock and the payment address are all read from the database here —
 * never taken from the request. A client that posts its own total would
 * otherwise set its own price.
 */
export const createOrder = async (params: CreateOrderParams) => {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return { success: false, message: "Please sign in to checkout" };
  }

  const parsedUsername = CheckoutSchema.safeParse({
    robloxUsername: params.robloxUsername,
  });

  if (!parsedUsername.success) {
    return {
      success: false,
      message: parsedUsername.error.issues[0]?.message ?? "Invalid username",
    };
  }

  const wanted = params.items.filter(
    (item) => item.id && Number.isInteger(item.quantity) && item.quantity > 0,
  );

  if (wanted.length === 0) {
    return { success: false, message: "Your cart is empty" };
  }

  // Return abandoned reservations first, so a customer is never told an item
  // is out of stock because somebody else opened a checkout and walked away.
  await releaseExpiredOrders();

  // Both lookups are independent — one round-trip of latency instead of two.
  const [rows, method] = await Promise.all([
    withRetry(() =>
      db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          salesPrice: products.salesprice,
          stock: products.stock,
        })
        .from(products)
        .where(
          and(
            inArray(products.id, wanted.map((item) => item.id)),
            eq(products.isActive, true),
          ),
        ),
    ),
    withRetry(() =>
      db
        .select({
          id: paymentMethods.id,
          code: paymentMethods.code,
          name: paymentMethods.name,
          network: paymentMethods.network,
          address: paymentMethods.address,
        })
        .from(paymentMethods)
        .where(
          and(
            eq(paymentMethods.id, params.paymentMethodId),
            eq(paymentMethods.isActive, true),
          ),
        )
        .limit(1),
    ),
  ]);

  if (method.length === 0) {
    return { success: false, message: "Choose a payment method" };
  }

  const lines = wanted.flatMap((item) => {
    const product = rows.find((row) => row.id === item.id);
    if (!product || product.stock <= 0) return [];

    // Cap at what is actually in stock rather than rejecting the whole order.
    const quantity = Math.min(item.quantity, product.stock);
    const { effective } = priceInfo(product.price, product.salesPrice);

    return [
      {
        productId: product.id,
        productName: product.name,
        unitPrice: effective,
        quantity,
      },
    ];
  });

  if (lines.length === 0) {
    return { success: false, message: "Those items are no longer available" };
  }

  const total = lines.reduce(
    (sum, line) => sum + Number(line.unitPrice) * line.quantity,
    0,
  );

  // Locked here rather than at payment time: the customer is shown one figure
  // and verified against that same figure, whatever the market does meanwhile.
  // The quote also carries identifying dust, which is what makes this order's
  // total distinguishable from every other open order's.
  const quote = await quotePayment(method[0].code, total);

  if (!quote.ok) {
    return { success: false, message: quote.reason };
  }

  try {
    // One transaction: an order without its items, items without an order, or
    // a reservation without either, are all corrupt states.
    const orderId = await db.transaction(async (tx) => {
      // Reserve first. The `stock >= quantity` predicate is the whole guard —
      // two shoppers racing for the last pet both run this, and Postgres
      // serialises the row update so exactly one of them matches.
      for (const line of lines) {
        const held = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${line.quantity}` })
          .where(
            and(
              eq(products.id, line.productId),
              sql`${products.stock} >= ${line.quantity}`,
            ),
          )
          .returning({ id: products.id });

        if (held.length === 0) {
          // Rolls the whole transaction back, including earlier reservations.
          throw new Error(`OUT_OF_STOCK:${line.productName}`);
        }
      }

      const [order] = await tx
        .insert(orders)
        .values({
          userId: user.id,
          customerName: user.name ?? "Customer",
          customerEmail: user.email ?? "",
          robloxUsername: parsedUsername.data.robloxUsername,
          status: "pending",
          total: total.toFixed(2),
          paymentMethodId: method[0].id,
          // Snapshots, so rotating a wallet never rewrites past orders.
          paymentMethodCode: method[0].code,
          paymentMethodName: method[0].name,
          paymentNetwork: method[0].network,
          paymentAddress: method[0].address,
          paymentAmount: quote.quote.amount,
          paymentAsset: quote.quote.asset,
          expiresAt: quote.quote.expiresAt,
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        lines.map((line) => ({ ...line, orderId: order.id })),
      );

      return order.id;
    });

    return { success: true, message: "Order created", orderId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.startsWith("OUT_OF_STOCK:")) {
      return {
        success: false,
        message: `${message.slice("OUT_OF_STOCK:".length)} just sold out — please adjust your cart`,
      };
    }

    console.error("[createOrder] failed:", error);
    return { success: false, message: "Could not create your order" };
  }
};

export type SubmitResult = {
  success: boolean;
  message: string;
  /** True while the payment is real but not yet confirmed. */
  pending?: boolean;
};

/**
 * Runs verification for an order and records the outcome.
 *
 * Shared by the first submission and every later re-check, so both paths apply
 * exactly the same rules — a re-check must never be a weaker test than the
 * original.
 */
const runVerification = async (order: {
  id: string;
  paymentAmount: string | null;
  methodCode: string | null;
  address: string | null;
  txHash: string;
  createdAt: Date;
}): Promise<SubmitResult> => {
  if (!order.methodCode || !order.address || !order.paymentAmount) {
    return { success: false, message: "This order has no payment method" };
  }

  const result = await verifyPayment({
    methodCode: order.methodCode,
    txHash: order.txHash,
    toAddress: order.address,
    // The locked figure including its dust, not a fresh conversion.
    expectedAmount: order.paymentAmount,
    orderCreatedAt: order.createdAt,
  });

  if (result.ok) {
    await db
      .update(orders)
      .set({
        status: "paid",
        paidAt: new Date(),
        verifiedAmount: result.amount,
        verificationNote: result.note,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    revalidatePath("/orders");
    revalidatePath("/admin/orders");

    return { success: true, message: "Payment confirmed — thank you!" };
  }

  if (result.disposition === "release") {
    // Not a payment to us at all, so free the hash and let the customer try
    // again with the right one. The order goes back to awaiting payment.
    await db
      .update(orders)
      .set({
        txHash: null,
        status: "pending",
        verificationNote: result.reason,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    return { success: false, message: result.reason };
  }

  // `retry` and `flag` both keep the hash claimed. The difference is that a
  // flagged order has our money sitting in it and needs a human, so it stops
  // being something the customer can act on and must not expire.
  await db
    .update(orders)
    .set({
      status: "processing",
      verificationNote: result.reason,
      ...(result.disposition === "flag" ? { expiresAt: null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  revalidatePath("/admin/orders");

  return {
    success: false,
    message: result.reason,
    pending: result.disposition === "retry",
  };
};

/**
 * Verifies a payment on-chain and confirms the order automatically.
 *
 * The customer supplies only a transaction reference. Everything that decides
 * the outcome — token contract, recipient, amount, age, confirmations — is
 * read from the chain here. Nothing the customer sends can mark an order paid.
 *
 * The hash is claimed first, in its own statement, so two people submitting
 * the same transaction cannot both be verified: the unique index rejects the
 * second before either reaches the explorer.
 */
export const submitTransactionHash = async (params: {
  orderId: string;
  txHash: string;
}): Promise<SubmitResult> => {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, message: "Please sign in" };
  }

  const txHash = params.txHash.trim();

  if (txHash.length < 26 || txHash.length > 128) {
    return { success: false, message: "That does not look like a transaction ID" };
  }

  // Claim the hash and count the attempt, scoped to the owner, only from
  // `pending`, only before the quote expires, and only under the attempt cap.
  // Every guard sits in the predicate rather than in a prior read, so none of
  // them can be raced.
  let claimed;
  try {
    claimed = await db
      .update(orders)
      .set({
        txHash,
        status: "processing",
        verificationAttempts: sql`${orders.verificationAttempts} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, params.orderId),
          eq(orders.userId, userId),
          eq(orders.status, "pending"),
          lt(orders.verificationAttempts, MAX_ATTEMPTS),
          sql`(${orders.expiresAt} is null or ${orders.expiresAt} > now())`,
        ),
      )
      .returning({
        id: orders.id,
        paymentAmount: orders.paymentAmount,
        paymentAsset: orders.paymentAsset,
        methodCode: orders.paymentMethodCode,
        methodName: orders.paymentMethodName,
        address: orders.paymentAddress,
        createdAt: orders.createdAt,
        total: orders.total,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        robloxUsername: orders.robloxUsername,
        attempts: orders.verificationAttempts,
      });
  } catch (error) {
    if ((error as { code?: string })?.code === UNIQUE_VIOLATION) {
      return {
        success: false,
        message: "That transaction has already been used for another order",
      };
    }

    console.error("[submitTransactionHash] claim failed:", error);
    return { success: false, message: "Could not submit your transaction" };
  }

  if (claimed.length === 0) {
    // The predicate covers several cases, so read back to say which one.
    const [existing] = await db
      .select({
        status: orders.status,
        attempts: orders.verificationAttempts,
        expiresAt: orders.expiresAt,
      })
      .from(orders)
      .where(and(eq(orders.id, params.orderId), eq(orders.userId, userId)))
      .limit(1);

    if (!existing) {
      return { success: false, message: "Order not found" };
    }

    if (existing.attempts >= MAX_ATTEMPTS) {
      return {
        success: false,
        message: "Too many attempts on this order — please contact support",
      };
    }

    if (existing.status === "processing") {
      return {
        success: false,
        message: "We are already checking a transaction for this order",
        pending: true,
      };
    }

    if (existing.expiresAt && existing.expiresAt.getTime() < Date.now()) {
      return {
        success: false,
        message:
          "This order expired because the quoted rate is no longer valid. Please order again.",
      };
    }

    return { success: false, message: "This order is no longer awaiting payment" };
  }

  const order = claimed[0];

  // Only on the first submission for this order. A customer whose payment is
  // still settling can claim again after a release, and the shop owner does not
  // need the same order announced up to ten times.
  if (order.attempts === 1) {
    // Sent after the response, so verification is not held up behind SMTP.
    after(async () => {
      await sendMail({
        to: ADMIN_ALERT_EMAIL,
        replyTo: order.customerEmail || undefined,
        ...newOrderEmail({
          orderId: order.id,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          robloxUsername: order.robloxUsername,
          total: order.total,
          paymentAmount: order.paymentAmount,
          paymentAsset: order.paymentAsset,
          methodName: order.methodName,
          txHash,
        }),
      });
    });
  }

  return runVerification({ ...order, txHash });
};

/**
 * Re-runs verification on an order that already holds a hash.
 *
 * Without this a customer who paid correctly is stranded: the first submission
 * almost always lands before the required confirmations exist, which leaves
 * the order in `processing` — a state the submit path deliberately refuses to
 * claim from. This is how they get out of it.
 */
export const recheckPayment = async (orderId: string): Promise<SubmitResult> => {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, message: "Please sign in" };
  }

  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      txHash: orders.txHash,
      paymentAmount: orders.paymentAmount,
      methodCode: orders.paymentMethodCode,
      address: orders.paymentAddress,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!order) {
    return { success: false, message: "Order not found" };
  }

  if (order.status === "paid" || order.status === "delivered") {
    return { success: true, message: "This order is already confirmed" };
  }

  if (!order.txHash) {
    return { success: false, message: "No transaction has been submitted yet" };
  }

  if (order.status !== "processing") {
    return { success: false, message: "This order is not awaiting verification" };
  }

  return runVerification({ ...order, txHash: order.txHash });
};
