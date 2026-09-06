'use server'

import { and, eq, inArray } from "drizzle-orm";

import { db, withRetry } from "@/drizzle";
import { products } from "@/Database/schema";

export type CartProduct = {
  id: string;
  name: string;
  image: string;
  price: string;
  salesPrice: string;
  stock: number;
};

/**
 * Resolves cart ids to current product rows.
 *
 * The cart stores only ids and quantities, so prices, stock and availability
 * are always read fresh here — a cart that cached them would quote a price the
 * store no longer offers. Deactivated or deleted products simply do not come
 * back, and the cart page treats those as removed.
 */
export const getCartProducts = async (ids: string[]): Promise<CartProduct[]> => {
  const unique = [...new Set(ids)].filter(Boolean);

  // `inArray` with an empty list produces invalid SQL, and there is nothing to
  // look up anyway.
  if (unique.length === 0) return [];

  return withRetry(() =>
    db
      .select({
        id: products.id,
        name: products.name,
        image: products.image,
        price: products.price,
        salesPrice: products.salesprice,
        stock: products.stock,
      })
      .from(products)
      .where(and(inArray(products.id, unique), eq(products.isActive, true))),
  );
};
