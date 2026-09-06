import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPrice, priceInfo } from "@/lib/format";
import AddToCartButton from "./AddToCartButton";

export type Product = {
  id: string;
  name: string;
  /** `numeric` columns come back as strings to preserve decimal precision. */
  price: string;
  salesPrice: string;
  image: string;
  stock: number;
};

/** Below this, stock is called out as urgency rather than reassurance. */
const LOW_STOCK_THRESHOLD = 3;

/**
 * Server Component — a product tile is read-only markup, so it ships no
 * JavaScript. Only the cart action becomes a client island once a cart exists.
 *
 * The whole tile is clickable via a stretched link on the title: one anchor in
 * the accessibility tree (announced once, with a real href) but a card-sized
 * target. The cart button is lifted above that overlay so it stays separately
 * clickable.
 */
const ProductCard = ({ product }: { product: Product }) => {
  const { onSale, discount, saved, effective } = priceInfo(
    product.price,
    product.salesPrice,
  );

  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= LOW_STOCK_THRESHOLD;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5",
        // Keyboard parity: focusing the title ring-highlights the whole tile.
        "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring/50",
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image ? (
          <Image
            src={product.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-105",
              soldOut && "grayscale",
            )}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImageOff className="size-6 text-muted-foreground" />
          </div>
        )}

        {/* A wash plus a centred label reads as unavailable far faster than a
            small corner badge. */}
        {soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <span className="rounded-full bg-neutral-900/90 px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase">
              Sold out
            </span>
          </div>
        ) : onSale ? (
          <span className="absolute top-2 left-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
            −{discount}%
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* min-h keeps one- and two-line titles from misaligning prices across
            a row of tiles. */}
        <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-snug">
          <Link
            href={`/products/${product.id}`}
            className="rounded outline-none after:absolute after:inset-0 group-hover:underline"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-heading text-lg font-semibold tabular-nums">
            {formatPrice(effective)}
          </span>
          {onSale ? (
            <span className="text-sm text-muted-foreground line-through tabular-nums">
              {formatPrice(product.price)}
            </span>
          ) : null}
        </div>

        {/* Reserved line: without it, tiles with and without a saving would sit
            at different heights. */}
        <p className="mt-1 min-h-4 text-xs font-medium text-red-600">
          {saved ? `Save ${saved}` : null}
        </p>

        <div className="mt-3 flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              soldOut
                ? "bg-muted-foreground/40"
                : lowStock
                  ? "bg-amber-500"
                  : "bg-emerald-500",
            )}
          />
          <p
            className={cn(
              "text-xs",
              lowStock ? "font-medium text-amber-600" : "text-muted-foreground",
            )}
          >
            {soldOut
              ? "Out of stock"
              : lowStock
                ? `Only ${product.stock} left`
                : "In stock"}
          </p>
        </div>

        {/* z-10 lifts the button above the stretched title link so it remains
            independently clickable. The button is the only client code here —
            the tile itself stays server-rendered. */}
        <AddToCartButton
          productId={product.id}
          name={product.name}
          stock={product.stock}
          className="relative z-10 mt-4 w-full"
        />
      </div>
    </article>
  );
};

export default ProductCard;
