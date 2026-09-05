import { notFound } from "next/navigation";
import { asc, count, eq } from "drizzle-orm";

import { db, withRetry } from "@/drizzle";
import { categories, games, products } from "@/Database/schema";
import CategoriesManager from "@/Components/admin/CategoriesManager";
import PageHeader from "@/Components/admin/PageHeader";
import Breadcrumbs from "@/Components/admin/Breadcrumbs";

/** Postgres throws on a malformed uuid, so reject it before querying. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GameDetailPage = async ({
  params,
}: PageProps<"/admin/games/[gameid]">) => {
  const { gameid } = await params;

  if (!UUID_PATTERN.test(gameid)) {
    notFound();
  }

  // Independent queries run concurrently — one round-trip of latency instead
  // of two. Product counts come from a grouped join rather than a query per
  // category, avoiding N+1.
  const [game, categoryRows] = await Promise.all([
    withRetry(() =>
      db
        .select({ id: games.id, name: games.name })
        .from(games)
        .where(eq(games.id, gameid))
        .limit(1),
    ),
    withRetry(() =>
      db
        .select({
          id: categories.id,
          name: categories.name,
          isActive: categories.isActive,
          productCount: count(products.id),
        })
        .from(categories)
        .leftJoin(products, eq(products.categoryId, categories.id))
        .where(eq(categories.gameId, gameid))
        .groupBy(categories.id)
        .orderBy(asc(categories.name)),
    ),
  ]);

  if (game.length === 0) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={game[0].name}
        description="Manage the categories and products for this game."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Games", href: "/admin/games" },
              { label: game[0].name },
            ]}
          />
        }
      />

      <CategoriesManager gameId={gameid} categories={categoryRows} />
    </>
  );
};

export default GameDetailPage;
