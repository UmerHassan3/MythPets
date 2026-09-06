import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { ArrowRight } from "lucide-react";

import { db, withRetry } from "@/drizzle";
import { reviews } from "@/Database/schema";
import StarRating from "@/Components/user/StarRating";

/**
 * Social proof from real data. Returns null when there are no reviews yet, so
 * the homepage never shows an empty testimonial shell.
 *
 * Server Component. The stats query aggregates in the database and the list is
 * limited to three, so nothing crosses the wire that is not rendered. Both run
 * concurrently — one round-trip of latency rather than two.
 */
const HomeReviews = async () => {
  const [stats, latest] = await Promise.all([
    withRetry(() =>
      db
        .select({
          total: sql<number>`count(*)::int`,
          average: sql<number | null>`round(avg(${reviews.rating}), 1)::float`,
        })
        .from(reviews),
    ),
    withRetry(() =>
      db
        .select({
          id: reviews.id,
          userName: reviews.userName,
          rating: reviews.rating,
          comment: reviews.comment,
        })
        .from(reviews)
        .orderBy(desc(reviews.createdAt))
        .limit(3),
    ),
  ]);

  const total = stats[0]?.total ?? 0;
  if (total === 0 || latest.length === 0) return null;

  const average = stats[0]?.average ?? 0;

  return (
    <section aria-labelledby="home-reviews" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="home-reviews"
              className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Trusted by traders
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <StarRating value={Math.round(average)} />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular-nums">
                  {average.toFixed(1)}
                </span>{" "}
                from {total} {total === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>

          <Link
            href="/reviews"
            className="inline-flex items-center gap-1 rounded text-sm font-medium outline-none hover:underline focus-visible:underline"
          >
            Read all reviews
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {latest.map((review) => (
            <li
              key={review.id}
              className="flex flex-col rounded-xl border bg-card p-5 shadow-sm"
            >
              <StarRating value={review.rating} />

              {review.comment ? (
                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                  {review.comment}
                </p>
              ) : null}

              <p className="mt-4 text-sm font-medium">{review.userName}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default HomeReviews;
