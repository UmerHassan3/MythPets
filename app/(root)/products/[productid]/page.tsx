import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, gt, ne } from "drizzle-orm";
import { ChevronRight, ImageOff, ShieldCheck, Truck, Zap } from "lucide-react";

import { db, withRetry } from "@/drizzle";
import { categories, games, products } from "@/Database/schema";
import { formatPrice, priceInfo } from "@/lib/format";
import { Button } from "@/Components/ui/button";
import ProductCard from "@/Components/user/ProductCard";
import AddToCartButton from "@/Components/user/AddToCartButton";

/** Postgres throws on a malformed uuid, so reject it before querying. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TRUST_POINTS = [
  { icon: Truck, text: "Delivered in-game via Roblox trade" },
  { icon: ShieldCheck, text: "We never ask for your account password" },
  { icon: Zap, text: "Live stock and instant checkout" },
] as const;

const page = async ({ params }: PageProps<"/products/[productid]">) => {
  const { productid } = await params;

  if (!UUID_PATTERN.test(productid)) {
    notFound();
  }

  // One joined lookup returns the product plus the names needed for the
  // breadcrumb — instead of three separate queries.
  const found = await withRetry(() =>
    db
      .select({
        id: products.id,
        name: products.name,
        image: products.image,
        price: products.price,
        salesPrice: products.salesprice,
        stock: products.stock,
        isFeatured: products.isFeatured,
        categoryId: categories.id,
        categoryName: categories.name,
        gameId: games.id,
        gameName: games.name,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(games, eq(products.gameId, games.id))
      .where(and(eq(products.id, productid), eq(products.isActive, true)))
      .limit(1),
  );

  if (found.length === 0) {
    notFound();
  }

  const product = found[0];
  const { onSale, discount, effective } = priceInfo(
    product.price,
    product.salesPrice,
  );
  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 3;

  // Fetched after the product because it depends on its category — but only
  // this one extra round-trip, and only the columns the card renders.
  const related = await withRetry(() =>
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
      .where(
        and(
          eq(products.categoryId, product.categoryId),
          eq(products.isActive, true),
          gt(products.stock, 0),
          ne(products.id, product.id),
        ),
      )
      .orderBy(asc(products.name))
      .limit(4),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-12">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5 opacity-60" />
          </li>
          <li className="text-foreground">{product.gameName}</li>
          <li aria-hidden>
            <ChevronRight className="size-3.5 opacity-60" />
          </li>
          <li aria-current="page" className="font-medium text-foreground">
            {product.categoryName}
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted shadow-sm">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageOff className="size-10 text-muted-foreground" />
            </div>
          )}

          {onSale && !soldOut ? (
            <span className="absolute top-4 left-4 rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white">
              -{discount}%
            </span>
          ) : null}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {product.gameName} · {product.categoryName}
          </p>

          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-heading text-3xl font-semibold tabular-nums">
              {formatPrice(effective)}
            </span>
            {onSale ? (
              <span className="text-lg text-muted-foreground line-through tabular-nums">
                {formatPrice(product.price)}
              </span>
            ) : null}
          </div>

          

          <div className="mt-10 sm:mt-8">
            <AddToCartButton
              productId={product.id}
              name={product.name}
              stock={product.stock}
              size="lg"
              className="w-full sm:w-auto sm:px-10"
            />
          </div>

          <ul className="mt-10 space-y-4 border-t pt-8 sm:mt-12 sm:space-y-3">
            {TRUST_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <Icon className="size-4 shrink-0 text-red-600" />
                <span className="text-muted-foreground">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-16 max-sm:mt-10 space-y-5 border-t pt-12 sm:mt-20 sm:pt-16">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            More in {product.categoryName}
          </h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default page;
