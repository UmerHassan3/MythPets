import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type StarRatingProps = {
  value: number;
  /** Tailwind size class for each star. */
  size?: string;
  className?: string;
};

/**
 * Read-only star display. Server Component — it ships no JavaScript, which
 * matters on a page rendering it once per review.
 */
const StarRating = ({ value, size = "size-4", className }: StarRatingProps) => (
  <div
    className={cn("flex items-center gap-0.5", className)}
    role="img"
    aria-label={`${value} out of 5 stars`}
  >
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        aria-hidden
        className={cn(
          size,
          star <= value
            ? "fill-amber-400 text-amber-400"
            : "fill-muted text-muted-foreground/30",
        )}
      />
    ))}
  </div>
);

export default StarRating;
