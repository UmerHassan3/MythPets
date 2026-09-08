'use server'

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/drizzle";
import { orderItems, orders, products } from "@/Database/schema";

export type OrderStatus =
  | "pending"
  | "processing"
  | "paid"
  | "delivered"
  | "cancelled";

/**
 * Which transitions are allowed from each state.
 *
 * Encoded here rather than trusted from the button that was clicked: a server
 * action is a public endpoint, so "mark delivered" must not work on an order
 * nobody has paid for.
 */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  processing: ["paid", "cancelled"],
  paid: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export const updateOrderStatus = async (params: {
  orderId: string;
  status: OrderStatus;
}) => {
  const session = await auth();

  // Admin-only. The layout guard protects the page; this protects the endpoint.
  if (session?.user?.role !== "admin") {
    return { success: false, message: "Not authorised" };
  }

  const { orderId, status } = params;

  try {
    const current = await db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (current.length === 0) {
      return { success: false, message: "Order not found" };
    }

    const from = current[0].status as OrderStatus;

    if (!ALLOWED[from]?.includes(status)) {
      return {
        success: false,
        message: `Cannot move an order from ${from} to ${status}`,
      };
    }

    await db.transaction(async (tx) => {
      const updated = await tx
        .update(orders)
        .set({
          status,
          // Stamped only on the transition into paid, so it records when the
          // money was confirmed rather than the last time the row was touched.
          ...(status === "paid" ? { paidAt: new Date() } : {}),
          // Cancelling gives the reservation back, so mark it spent here. The
          // flag is what stops the expiry sweep returning the same stock again.
          ...(status === "cancelled" ? { stockReleased: true } : {}),
          updatedAt: new Date(),
        })
        // Re-checking the status inside the transaction closes the gap between
        // the read above and this write: two admins cancelling at once would
        // otherwise both restore stock.
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.status, from),
            ...(status === "cancelled"
              ? [eq(orders.stockReleased, false)]
              : []),
          ),
        )
        .returning({ id: orders.id });

      if (updated.length === 0) {
        throw new Error("STALE");
      }

      if (status !== "cancelled") return;

      // Stock was held when the order was created, so cancelling has to put it
      // back — otherwise every cancelled order quietly destroys inventory.
      const lines = await tx
        .select({
          productId: orderItems.productId,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      for (const line of lines) {
        if (!line.productId) continue;

        await tx
          .update(products)
          .set({ stock: sql`${products.stock} + ${line.quantity}` })
          .where(eq(products.id, line.productId));
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STALE") {
      return {
        success: false,
        message: "That order changed while you were looking at it — reload",
      };
    }

    console.error("[updateOrderStatus] failed:", error);
    return { success: false, message: "Could not update the order" };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/orders");

  return { success: true, message: `Order marked ${status}` };
};
