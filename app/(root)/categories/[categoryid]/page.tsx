import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, eq, ilike } from "drizzle-orm";
import { SearchX } from "lucide-react";

import { db, withRetry } from "@/drizzle";
import { categories, products } from "@/Database/schema";
import ProductCard from "@/Components/user/ProductCard";
import ProductSearch from "@/Components/user/ProductSearch";
import Pagination from "@/Components/user/Pagination";

const PRODUCTS_PER_PAGE = 10;

/** Postgres throws on a malformed uuid, so reject it before querying. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `%` and `_` are LIKE wildcards — escape so a search for "50%" is literal. */
const escapeLike = (term: string) => term.replace(/[\\%_]/g, "\\$&");

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const Page = async ({
  params,
  searchParams,
}: PageProps<"/categories/[categoryid]">) => {
  const { categoryid } = await params;
  const search = await searchParams;

  if (!UUID_PATTERN.test(categoryid)) {
    notFound();
  }

  const query = (first(search.q) ?? "").trim();
  const requested = Math.max(1, Number(first(search.page)) || 1);

  // Applied to both the count and the page query, so they can never disagree
  // about what is being listed.
  const where = and(
    eq(products.categoryId, categoryid),
    // Customers must not see products the admin has deactivated.
    eq(products.isActive, true),
    query ? ilike(products.name, `%${escapeLike(query)}%`) : undefined,
  );

  // The category is fetched separately rather than read off the first product:
  // a search with no matches still needs a heading.
  const [category, [{ total }]] = await Promise.all([
    withRetry(() =>
      db
        .select({ name: categories.name })
        .from(categories)
        .where(eq(categories.id, categoryid))
        .limit(1),
    ),
    withRetry(() =>
      db.select({ total: count(products.id) }).from(products).where(where),
    ),
  ]);

  if (category.length === 0) {
    notFound();
  }

  const totalProducts = Number(total);
  const totalPages = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_PAGE));
  // Clamp so ?page=99 shows the last page rather than an empty grid.
  const currentPage = Math.min(requested, totalPages);

  const productList = totalProducts
    ? await withRetry(() =>
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
          .where(where)
          .orderBy(asc(products.name))
          .limit(PRODUCTS_PER_PAGE)
          .offset((currentPage - 1) * PRODUCTS_PER_PAGE),
      )
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="space-y-5 border-b pb-8">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {category[0].name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {query
              ? `${totalProducts} ${totalProducts === 1 ? "result" : "results"} for “${query}”`
              : `${totalProducts} ${totalProducts === 1 ? "product" : "products"}`}
          </p>
        </div>

        <div className="max-w-md">
          <ProductSearch
            initialQuery={query}
            placeholder={`Search in ${category[0].name}…`}
          />
        </div>
      </header>

      {productList.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <SearchX className="size-5 text-muted-foreground" />
          </div>
          <p className="font-heading text-lg font-semibold">
            {query ? "No matches" : "Nothing here yet"}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {query
              ? `We couldn't find a product matching “${query}” in this category.`
              : "Products will appear here once they are added."}
          </p>
          {query ? (
            <Link
              href={`/categories/${categoryid}`}
              className="pt-1 text-sm font-medium underline underline-offset-4"
            >
              Clear search
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {productList.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="mt-10">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              basePath={`/categories/${categoryid}`}
              query={query ? { q: query } : undefined}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Page;
