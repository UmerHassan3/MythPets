"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";

import { createReview } from "@/lib/actions/user-actions/review";
import { Button } from "@/Components/ui/button";
import { Textarea } from "@/Components/ui/textarea";
import { cn } from "@/lib/utils";

export type ReviewGame = { id: string; name: string };

type ReviewFormProps = {
  userId: string;
  games: ReviewGame[];
  /** Lets the dialog close itself once the review is saved. */
  onSuccess?: () => void;
};

const MAX_COMMENT = 1000;

const ReviewForm = ({ userId, games, onSuccess }: ReviewFormProps) => {
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!gameId) {
      toast.error("Please choose a game.");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please write a review.");
      return;
    }

    startTransition(async () => {
      const result = await createReview({
        Id: userId,
        gameId,
        rating,
        comment,
      });

      if (result.success) {
        toast.success(result.message);
        setComment("");
        setRating(5);
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Only shown when there is a choice to make. */}
      {games.length > 1 ? (
        <div className="space-y-2">
          <label htmlFor="review-game" className="text-sm font-medium">
            Game
          </label>
          <select
            id="review-game"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Rating</legend>

        <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              aria-pressed={rating === star}
              className="rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Star
                className={cn(
                  "size-7 transition-colors",
                  star <= (hovered || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-muted text-muted-foreground/40",
                )}
              />
            </button>
          ))}

          <span className="ml-2 text-sm text-muted-foreground tabular-nums">
            {rating}/5
          </span>
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="review-comment" className="text-sm font-medium">
          Your review
        </label>

        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
          placeholder="How was the trade? Delivery speed, communication, pricing…"
          rows={5}
        />

        <p className="text-right text-xs text-muted-foreground tabular-nums">
          {comment.length}/{MAX_COMMENT}
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
};

export default ReviewForm;
