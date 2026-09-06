"use client";

import { MessageSquareQuote } from "lucide-react";

import { deleteReview } from "@/lib/actions/admin-actions/delete-review";
import StarRating from "@/Components/user/StarRating";
import Pagination from "@/Components/user/Pagination";
import PageHeader from "./PageHeader";
import EmptyState from "./EmptyState";
import DeleteButton from "./DeleteButton";

export type ReviewRow = {
  id: string;
  userName: string;
  gameName: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
};

type ReviewsShowcaseProps = {
  /** The rows for the current page — paginated on the server. */
  reviews: ReviewRow[];
  page: number;
  totalPages: number;
  /** Total across all pages, for the header count. */
  total: number;
};

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

/**
 * Client component only because `DeleteButton` needs a click handler and a
 * toast. Data and paging are resolved on the server and arrive as props, so
 * this ships no fetching logic.
 */
const ReviewsShowcase = ({
  reviews,
  page,
  totalPages,
  total,
}: ReviewsShowcaseProps) => {
  return (
    <>
      <PageHeader
        title="Reviews"
        description={
          total === 1 ? "1 review" : `${total} reviews from customers`
        }
      />

      {reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          title="No reviews yet"
          description="Customer reviews will appear here once people start leaving them."
        />
      ) : (
        <>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="flex items-start gap-4 p-4 transition-colors hover:bg-muted/40 sm:p-5"
              >
                <div
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground"
                >
                  {initials(review.userName)}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-medium">{review.userName}</p>
                    <StarRating value={review.rating} size="size-3.5" />
                    <span className="text-xs text-muted-foreground">
                      {review.gameName}
                    </span>
                    <time
                      dateTime={review.createdAt.toISOString()}
                      className="ml-auto text-xs text-muted-foreground"
                    >
                      {dateFormat.format(review.createdAt)}
                    </time>
                  </div>

                  {review.comment ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {review.comment}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/60 italic">
                      No comment left
                    </p>
                  )}
                </div>

                {/* Reuses the shared confirm-then-delete control, so this
                    destructive action behaves exactly like the others in the
                    admin. The action takes an object, the button passes an id. */}
                <DeleteButton
                  action={(id) => deleteReview({ id })}
                  id={review.id}
                  label={`${review.userName}'s review`}
                  description="This permanently removes the review from the site."
                />
              </li>
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/admin/manage-reviews"
          />
        </>
      )}
    </>
  );
};

export default ReviewsShowcase;
