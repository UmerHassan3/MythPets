import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";

import { Button } from "@/Components/ui/button";
import { cn } from "@/lib/utils";
import { formatPrice, priceInfo } from "@/lib/format";

export type Product = {
  id: string;
  name: string;
  /** `numeric` columns come back as strings to preserve decimal precision. */
  price: string;
  salesPrice: string;
  image: string;
  stock: number;
};

/**
 * Server Component — a product tile is read-only markup, so it ships no
 * JavaScript. Navigation uses `Link` rather than a router push in a click
 * handler: that keeps the tile server-rendered, and gives real anchor
 * behaviour (middle-click, open in new tab, crawlable href).
 *
 * Only the cart action needs to become a client island once a cart exists.
 */
const ProductCard = ({ product }: { product: Product }) => {
  const { onSale, discount, effective } = priceInfo(
    product.price,
    product.salesPrice,
  );

  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 3;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
      <Link
        href={`/products/${product.id}`}
        tabIndex={-1}
        aria-hidden
        className="relative aspect-square overflow-hidden bg-muted"
      >
        {product.image ? (
          <Image
            src={product.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className={cn(
              "object-cover transition-transform duration-300 group-hover:scale-105",
              soldOut && "opacity-50 grayscale",
            )}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImageOff className="size-6 text-muted-foreground" />
          </div>
        )}

        {onSale && !soldOut ? (
          <span className="absolute top-2 left-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
            -{discount}%
          </span>
        ) : null}

        {soldOut ? (
          <span className="absolute top-2 left-2 rounded-full bg-neutral-900/85 px-2 py-0.5 text-xs font-semibold text-white">
            Sold out
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* The title carries the link for assistive tech; the image above is
            marked aria-hidden so the tile is announced once, not twice. */}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          <Link
            href={`/products/${product.id}`}
            className="rounded outline-none hover:underline focus-visible:underline"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-lg font-semibold tabular-nums">
              {formatPrice(effective)}
            </span>
            {onSale ? (
              <span className="text-sm text-muted-foreground line-through tabular-nums">
                {formatPrice(product.price)}
              </span>
            ) : null}
          </div>

          

          <Button className="w-full" disabled={soldOut}>
            {soldOut ? "Sold out" : "Add to cart"}
          </Button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
