import Link from "next/link";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { ArrowRight, PackageSearch, Sparkles } from "lucide-react";

import { db, withRetry } from "@/drizzle";
import { categories, games, products } from "@/Database/schema";
import ProductCard, { type Product } from "./ProductCard";


/** Products shown per category before the section is truncated. */
const PER_CATEGORY = 8;

type Section = {
  categoryName: string;
  gameName: string;
  items: Product[];
  total: number;
};

/**
 * Server Component — data is fetched here, so the browser gets finished HTML
 * with no request waterfall and no loading spinner.
 *
 * The two queries are independent and run concurrently, so the page pays one
 * round-trip of latency rather than two. Each joins rather than fetching
 * categories and then their products, which would be N+1.
 */
const ProductShowcase = async () => {
  const visible = and(
    // Customers must never see products the admin has deactivated.
    eq(products.isActive, true),
    eq(categories.isActive, true),
    eq(games.isActive, true),
    gt(products.stock, 0),
  );

  const columns = {
    id: products.id,
    categoryId: categories.id,
    categoryName: categories.name,
    gameName: games.name,
    name: products.name,
    image: products.image,
    price: products.price,
    salesPrice: products.salesprice,
    stock: products.stock,
  };

  const [featured, rows] = await Promise.all([
    withRetry(() =>
      db
        .select(columns)
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .innerJoin(games, eq(products.gameId, games.id))
        .where(and(visible, eq(products.isFeatured, true)))
        .orderBy(desc(products.createdAt))
        .limit(4),
    ),
    withRetry(() =>
      db
        .select(columns)
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .innerJoin(games, eq(products.gameId, games.id))
        .where(visible)
        .orderBy(asc(games.name), asc(categories.name), asc(products.name))
        .limit(60),
    ),
  ]);

  const toProduct = (row: (typeof rows)[number]): Product => ({
    id: row.id,
    name: row.name,
    image: row.image,
    price: row.price,
    salesPrice: row.salesPrice,
    stock: row.stock,
  });

  // Rows arrive ordered by game then category, so a Map preserves that order
  // without a second sort.
  const sections = new Map<string, Section>();

  for (const row of rows) {
    const section =
      sections.get(row.categoryId) ??
      ({
        categoryName: row.categoryName,
        gameName: row.gameName,
        items: [],
        total: 0,
      } satisfies Section);

    section.total += 1;
    if (section.items.length < PER_CATEGORY) {
      section.items.push(toProduct(row));
    }

    sections.set(row.categoryId, section);
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <PackageSearch className="size-5 text-muted-foreground" />
        </div>
        <p className="font-heading text-lg font-semibold">Nothing in stock</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          New pets are added regularly — check back shortly, or message us and
          we'll let you know when something lands.
        </p>
        <Link
          href="/contact"
          className="pt-1 text-sm font-medium underline underline-offset-4"
        >
          Get in touch
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {featured.length > 0 ? (
        /* Featured sits on a tinted, bordered panel so it reads as a curated
           shelf rather than just another category heading. */
        <section className="rounded-2xl border bg-muted/40 p-5 sm:p-8">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 shrink-0 text-red-600" />
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Featured
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Hand-picked pets our traders recommend right now.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((row) => (
              <ProductCard key={row.id} product={toProduct(row)} />
            ))}
          </div>
        </section>
      ) : null}

      {[...sections].map(([categoryId, section]) => (
        <section key={categoryId} className="space-y-5">
          {/* Header carries the title and the "view all" affordance on one
              baseline — a centred button under the grid reads as the end of the
              page rather than the end of a shelf. */}
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b pb-4">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {section.gameName}
              </p>
              <h2 className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                {section.categoryName}
              </h2>
            </div>

            <Link
              href={`/categories/${categoryId}`}
              className="group inline-flex shrink-0 items-center gap-1 rounded text-sm font-medium outline-none hover:underline focus-visible:underline"
            >
              {/* Only promises "all" when there is more than what is shown. */}
              {section.total > section.items.length
                ? `View all ${section.total}`
                : "View all"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {section.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ProductShowcase;
