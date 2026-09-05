import { and, asc, desc, eq, gt } from "drizzle-orm";
import { PackageSearch, Sparkles } from "lucide-react";

import { db, withRetry } from "@/drizzle";
import { categories, games, products } from "@/Database/schema";
import ProductCard, { type Product } from "./ProductCard";
import Btn from "./Btn";


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
          New pets are added regularly — check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-14">
      {featured.length > 0 ? (
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-red-600" />
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Featured
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((row) => (
              <ProductCard key={row.id} product={toProduct(row)} />
            ))}
          </div>
        </section>
      ) : null}

      {[...sections].map(([categoryId, section], index) => (
        <section key={categoryId} className="space-y-5">
          {/* A rule above every section after the first gives the page a clear
              rhythm without boxing each group in a card. */}
          {index > 0 || featured.length > 0 ? (
            <hr className="border-border" />
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {section.gameName}
              </p>
              <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                {section.categoryName}
              </h2>
            </div>


          
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {section.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
            <span className="flex justify-center mt-4">
              <Btn
              id={categoryId}
              text="View All"
              to="categories"
              />
            </span>
        </section>
      ))}
    </div>
  );
};

export default ProductShowcase;
