import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, count, eq, gt, ilike } from "drizzle-orm";
import { SearchX } from "lucide-react";

import { db, withRetry } from "@/drizzle";
import { games, products } from "@/Database/schema";
import ProductCard from "@/Components/user/ProductCard";
import ProductSearch from "@/Components/user/ProductSearch";
import Pagination from "@/Components/user/Pagination";

export const metadata: Metadata = {
  title: "Adopt Me Pets — MythPets",
  description:
    "Browse every Adopt Me pet in stock. Live prices, in-game delivery, no account sharing.",
};

const PER_PAGE = 20;
const GAME_NAME = "Adopt me";
const BASE_PATH = "/adopt-me";

/** `%` and `_` are LIKE wildcards — escape so a search for "50%" is literal. */
const escapeLike = (term: string) => term.replace(/[\\%_]/g, "\\$&");

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const page = async ({ searchParams }: PageProps<"/adopt-me">) => {
  const search = await searchParams;
  const query = (first(search.q) ?? "").trim();
  const requested = Math.max(1, Number(first(search.page)) || 1);

  // Built once and shared by the count and the page query, so the two can
  // never disagree about what is being listed. Matched on game name
  // case-insensitively rather than a hardcoded id.
  const where = and(
    ilike(games.name, GAME_NAME),
    eq(games.isActive, true),
    eq(products.isActive, true),
    gt(products.stock, 0),
    query ? ilike(products.name, `%${escapeLike(query)}%`) : undefined,
  );

  const [{ total }] = await withRetry(() =>
    db
      .select({ total: count(products.id) })
      .from(products)
      .innerJoin(games, eq(products.gameId, games.id))
      .where(where),
  );

  const totalProducts = Number(total);
  const totalPages = Math.max(1, Math.ceil(totalProducts / PER_PAGE));
  // Clamp so ?page=99 shows the last page rather than an empty grid.
  const current = Math.min(requested, totalPages);

  // Skipped entirely when the count is zero — no point paying a round-trip to
  // fetch nothing.
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
          .innerJoin(games, eq(products.gameId, games.id))
          .where(where)
          .orderBy(asc(products.name))
          .limit(PER_PAGE)
          .offset((current - 1) * PER_PAGE),
      )
    : [];

  const showingFrom = (current - 1) * PER_PAGE + 1;
  const showingTo = Math.min(current * PER_PAGE, totalProducts);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="space-y-6 border-b pb-8">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Roblox
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Adopt Me
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Every pet currently in stock. Delivered in-game by a real trader —
            we never ask for your account password.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="w-full max-w-md">
            <ProductSearch
              initialQuery={query}
              placeholder="Search Adopt Me pets…"
            />
          </div>

          <p className="text-sm text-muted-foreground tabular-nums">
            {totalProducts === 0
              ? query
                ? `No results for “${query}”`
                : "No pets in stock"
              : `Showing ${showingFrom}–${showingTo} of ${totalProducts}`}
          </p>
        </div>
      </header>

      {productList.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <SearchX className="size-5 text-muted-foreground" />
          </div>
          <p className="font-heading text-lg font-semibold">
            {query ? "No matches" : "Nothing in stock"}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {query
              ? `We couldn't find an Adopt Me pet matching “${query}”.`
              : "New pets are added regularly — check back shortly."}
          </p>
          {query ? (
            <Link
              href={BASE_PATH}
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

          <div className="mt-12">
            <Pagination
              page={current}
              totalPages={totalPages}
              basePath={BASE_PATH}
              query={query ? { q: query } : undefined}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default page;
