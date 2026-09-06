import { desc, sql } from "drizzle-orm";

import { db, withRetry } from "@/drizzle";
import { reviews } from "@/Database/schema";
import ReviewsShowcase from "@/Components/admin/ReviewsShowcase";

const PER_PAGE = 20;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const page = async ({ searchParams }: PageProps<"/admin/manage-reviews">) => {
  const params = await searchParams;
  const requested = Math.max(1, Number(first(params.page)) || 1);

  // Counted in the database rather than by fetching every row and measuring
  // the array — the whole point of paginating.
  const [{ total }] = await withRetry(() =>
    db.select({ total: sql<number>`count(*)::int` }).from(reviews),
  );

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  // Clamp so ?page=99 shows the last page rather than an empty list.
  const current = Math.min(requested, totalPages);

  // Skipped entirely when there is nothing to show.
  const rows = total
    ? await withRetry(() =>
        db
          .select({
            id: reviews.id,
            userName: reviews.userName,
            gameName: reviews.gameName,
            rating: reviews.rating,
            comment: reviews.comment,
            createdAt: reviews.createdAt,
          })
          .from(reviews)
          .orderBy(desc(reviews.createdAt))
          .limit(PER_PAGE)
          .offset((current - 1) * PER_PAGE),
      )
    : [];

  return (
    <ReviewsShowcase
      reviews={rows}
      page={current}
      totalPages={totalPages}
      total={total}
    />
  );
};

export default page;
