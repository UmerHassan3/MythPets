import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { MessageSquareQuote } from "lucide-react";

import { db, withRetry } from "@/drizzle";
import { games, reviews } from "@/Database/schema";
import { auth } from "@/auth";
import { Button } from "@/Components/ui/button";
import StarRating from "@/Components/user/StarRating";
import Pagination from "@/Components/user/Pagination";
import ReviewDialog from "@/Components/user/ReviewDialog";

export const metadata: Metadata = {
  title: "Reviews — MythPets",
  description: "What traders say about buying Adopt Me pets from MythPets.",
};

const PER_PAGE = 10;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Two initials for the avatar, falling back to a neutral glyph. */
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const page = async ({ searchParams }: PageProps<"/reviews">) => {
  const params = await searchParams;
  const raw = Number(Array.isArray(params.page) ? params.page[0] : params.page);
  const requested = Number.isInteger(raw) && raw > 0 ? raw : 1;

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Three independent queries run concurrently — one round-trip of latency
  // instead of three. The stats come from an aggregate so no rows cross the
  // wire just to be counted, and the page query is limit/offset so only the
  // ten rows being displayed are fetched.
  const [stats, gameRows] = await Promise.all([
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
        .select({ id: games.id, name: games.name })
        .from(games)
        .where(eq(games.isActive, true))
        .orderBy(games.name),
    ),
  ]);

  const total = stats[0]?.total ?? 0;
  const average = stats[0]?.average ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  // Clamp so ?page=999 shows the last page instead of an empty list.
  const current = Math.min(requested, totalPages);

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

  const writeAction = userId ? (
    <ReviewDialog userId={userId} games={gameRows} />
  ) : (
    <Button nativeButton={false} render={<Link href="/sign-in" />}>
      Sign in to review
    </Button>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b pb-8">
        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Reviews
          </h1>

          {total > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <StarRating value={Math.round(average)} size="size-5" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular-nums">
                  {average.toFixed(1)}
                </span>{" "}
                out of 5 · {total} {total === 1 ? "review" : "reviews"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              What traders say about buying from MythPets.
            </p>
          )}
        </div>

        {writeAction}
      </header>

      {rows.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <MessageSquareQuote className="size-5 text-muted-foreground" />
          </div>
          <p className="font-heading text-lg font-semibold">No reviews yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Be the first to share how your trade went — it helps other buyers
            know what to expect.
          </p>
          <div className="pt-2">{writeAction}</div>
        </div>
      ) : (
        <>
          <ul className="mt-8 space-y-4">
            {rows.map((review) => (
              <li
                key={review.id}
                className="rounded-xl border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground"
                  >
                    {initials(review.userName)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <p className="font-medium">{review.userName}</p>
                      <time
                        dateTime={review.createdAt.toISOString()}
                        className="text-xs text-muted-foreground"
                      >
                        {dateFormat.format(review.createdAt)}
                      </time>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <StarRating value={review.rating} />
                      <span className="text-xs text-muted-foreground">
                        {review.gameName}
                      </span>
                    </div>

                    {review.comment ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {review.comment}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <Pagination
              page={current}
              totalPages={totalPages}
              basePath="/reviews"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default page;
