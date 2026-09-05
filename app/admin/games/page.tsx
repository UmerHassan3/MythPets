import { count, desc, eq } from "drizzle-orm";

import { db, withRetry } from "@/drizzle";
import { categories, games } from "@/Database/schema";
import GamesManager from "@/Components/admin/GamesManager";

/**
 * Data is fetched here rather than in the client component: no request
 * waterfall, no loading spinner, and the query runs on the server where the
 * database round-trip is cheap.
 *
 * The category count comes from a grouped left join rather than a query per
 * row — one round-trip instead of N+1, which matters on a slow link. Columns
 * are listed explicitly so the wire only carries what the table renders.
 */
const GamesPage = async () => {
  const rows = await withRetry(() =>
    db
      .select({
        id: games.id,
        name: games.name,
        image: games.image,
        isActive: games.isActive,
        categoryCount: count(categories.id),
      })
      .from(games)
      .leftJoin(categories, eq(categories.gameId, games.id))
      .groupBy(games.id)
      .orderBy(desc(games.createdAt)),
  );

  return <GamesManager games={rows} />;
};

export default GamesPage;
