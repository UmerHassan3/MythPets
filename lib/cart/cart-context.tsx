"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Only the id and quantity are persisted. Prices, stock and names are read from
 * the database when the cart renders — caching them here would let the cart
 * show a price or availability that no longer exists.
 */
export type CartItem = { id: string; quantity: number };

const STORAGE_KEY = "mythpets:cart";

type CartContextValue = {
  items: CartItem[];
  /** Total units, for the header badge. */
  count: number;
  /** False until localStorage has been read, so the UI can avoid a flash. */
  hydrated: boolean;
  add: (id: string, options?: { max?: number }) => "added" | "increased" | "max";
  setQuantity: (id: string, quantity: number, max?: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const read = (): CartItem[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Storage is user-writable and survives deploys, so validate rather than
    // trusting the shape.
    return parsed.flatMap((entry) =>
      entry &&
      typeof entry === "object" &&
      typeof (entry as CartItem).id === "string" &&
      Number.isInteger((entry as CartItem).quantity) &&
      (entry as CartItem).quantity > 0
        ? [{ id: (entry as CartItem).id, quantity: (entry as CartItem).quantity }]
        : [],
    );
  } catch {
    // Private mode, disabled storage, or corrupt JSON — an empty cart is a
    // reasonable fallback and must never break the page.
    return [];
  }
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Read after mount: localStorage does not exist during server rendering, and
  // seeding initial state from it would cause a hydration mismatch.
  useEffect(() => {
    setItems(read());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or blocked — the cart still works for this session.
    }
  }, [items, hydrated]);

  // Keeps two open tabs in step.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setItems(read());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback<CartContextValue["add"]>((id, options) => {
    const max = options?.max ?? Infinity;
    let outcome: "added" | "increased" | "max" = "added";

    setItems((current) => {
      const existing = current.find((item) => item.id === id);

      if (!existing) {
        outcome = "added";
        return [...current, { id, quantity: 1 }];
      }

      if (existing.quantity >= max) {
        outcome = "max";
        return current;
      }

      outcome = "increased";
      return current.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });

    return outcome;
  }, []);

  const setQuantity = useCallback<CartContextValue["setQuantity"]>(
    (id, quantity, max) => {
      const capped = Math.max(1, Math.min(quantity, max ?? Infinity));
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, quantity: capped } : item,
        ),
      );
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({ items, count, hydrated, add, setQuantity, remove, clear }),
    [items, count, hydrated, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return context;
};
