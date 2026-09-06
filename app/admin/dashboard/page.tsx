import Link from "next/link";
import { and, asc, eq, gt, lte, or, sql } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FolderTree,
  Gamepad2,
  Package,
  Users,
} from "lucide-react";

import { db, withRetry } from "@/drizzle";
import { categories, games, products } from "@/Database/schema";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import PageHeader from "@/Components/admin/PageHeader";
import { Card, CardContent } from "@/Components/ui/card";
import { Badge } from "@/Components/ui/badge";

/** At or below this, stock is treated as needing a restock. */
const LOW_STOCK_THRESHOLD = 3;

type Totals = {
  games: number;
  categories: number;
  products: number;
  users: number;
  outOfStock: number;
  lowStock: number;
};

const STATS = [
  {
    key: "games",
    label: "Games",
    icon: Gamepad2,
    href: "/admin/games",
    hint: "Manage games",
  },
  {
    key: "categories",
    label: "Categories",
    icon: FolderTree,
    href: "/admin/games",
    hint: "Grouped under games",
  },
  {
    key: "products",
    label: "Products",
    icon: Package,
    href: "/admin/games",
    hint: "Across all categories",
  },
  {
    key: "users",
    label: "Users",
    icon: Users,
    // No admin screen for users yet, so this tile is not a link.
    href: undefined,
    hint: "Registered accounts",
  },
] as const satisfies ReadonlyArray<{
  key: keyof Totals;
  label: string;
  icon: typeof Users;
  href?: string;
  hint: string;
}>;

const DashboardPage = async () => {
  // Two independent queries, run concurrently — one round-trip of latency.
  //
  // The counts are a single statement with scalar subqueries rather than six
  // separate `count()` queries: each of those would take its own pool
  // connection and pay its own TLS handshake, which dominates the cost here.
  const [countRows, attention] = await Promise.all([
    withRetry(() =>
      db.execute<Totals>(sql`
        select
          (select count(*)::int from "games")      as games,
          (select count(*)::int from "categories") as categories,
          (select count(*)::int from "products")   as products,
          (select count(*)::int from "users")      as users,
          (select count(*)::int from "products" where stock = 0)
                                                   as "outOfStock",
          (select count(*)::int from "products"
             where stock > 0 and stock <= ${LOW_STOCK_THRESHOLD})
                                                   as "lowStock"
      `),
    ),
    // Only the handful actually rendered — the counts above come from the
    // aggregate, so this is capped rather than fetching every low row.
    withRetry(() =>
      db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          stock: products.stock,
          gameId: products.gameId,
          categoryId: products.categoryId,
          categoryName: categories.name,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .innerJoin(games, eq(products.gameId, games.id))
        .where(
          and(
            eq(products.isActive, true),
            or(
              eq(products.stock, 0),
              and(
                gt(products.stock, 0),
                lte(products.stock, LOW_STOCK_THRESHOLD),
              ),
            ),
          ),
        )
        .orderBy(asc(products.stock), asc(products.name))
        .limit(6),
    ),
  ]);

  const totals = countRows.rows[0];
  const needsAttention = totals.outOfStock + totals.lowStock;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="An overview of your catalogue and customers."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map(({ key, label, icon: Icon, href, hint }) => {
          const card = (
            <Card className="h-full transition-colors group-hover:border-foreground/20 group-hover:bg-muted/40">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  {href ? (
                    <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  ) : null}
                </div>

                <div className="space-y-1">
                  <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight">
                    {totals[key]}
                  </p>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
              </CardContent>
            </Card>
          );

          return href ? (
            <Link
              key={key}
              href={href}
              className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {card}
            </Link>
          ) : (
            <div key={key} className="group">
              {card}
            </div>
          );
        })}
      </div>

      {/* The actionable half of the page: counts tell you the size of the
          catalogue, this tells you what to do about it today. */}
      <section aria-labelledby="needs-attention" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="needs-attention"
            className="font-heading text-lg font-semibold tracking-tight"
          >
            Needs attention
          </h2>

          {needsAttention > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {totals.outOfStock > 0 ? (
                <Badge variant="destructive">
                  {totals.outOfStock} out of stock
                </Badge>
              ) : null}
              {totals.lowStock > 0 ? (
                <Badge variant="secondary">{totals.lowStock} low stock</Badge>
              ) : null}
            </div>
          ) : null}
        </div>

        {attention.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border bg-card p-5">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Everything is in stock</p>
              <p className="text-sm text-muted-foreground">
                No products are out of stock or running low.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {attention.map((product) => {
              const out = product.stock === 0;

              return (
                <li key={product.id}>
                  <Link
                    href={`/admin/games/${product.gameId}/${product.categoryId}`}
                    className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                  >
                    <AlertTriangle
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0",
                        out ? "text-destructive" : "text-amber-500",
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {product.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {product.categoryName} · {formatPrice(product.price)}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "shrink-0 text-sm font-medium tabular-nums",
                        out ? "text-destructive" : "text-amber-600",
                      )}
                    >
                      {out ? "Out of stock" : `${product.stock} left`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
};

export default DashboardPage;
