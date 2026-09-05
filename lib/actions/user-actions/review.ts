"use server";

import { games, reviews, users } from "@/Database/schema";
import { db } from "@/drizzle";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** Postgres unique_violation — the table allows one review per user. */
const UNIQUE_VIOLATION = "23505";

type ReviewsProps = {
  Id: string;
  gameId: string;
  rating: number;
  comment: string;
};

export const createReview = async (params: ReviewsProps) => {
  const { Id, gameId, rating, comment } = params;

  if (!Id || !gameId || !rating || !comment) {
    return {
      success: false,
      message: "All fields are required",
    };
  }

  // Get user
  const user = await db
    .select({
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, Id))
    .limit(1);

  if (!user[0]) {
    return {
      success: false,
      message: "User not found",
    };
  }

  // Get game
  const game = await db
    .select({
      name: games.name,
    })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  if (!game[0]) {
    return {
      success: false,
      message: "Game not found",
    };
  }

  // Create review
  try {
    const review = await db
      .insert(reviews)
      .values({
        gameId,
        userId: Id,
        userName: user[0].name,
        gameName: game[0].name,
        comment: comment.trim(),
        rating,
      })
      .returning();

    if (review.length === 0) {
      return { success: false, message: "Error while adding review" };
    }
  } catch (error) {
    // The table has a unique constraint on user_id, so a second review from
    // the same person raises 23505 rather than returning a result.
    if ((error as { code?: string })?.code === UNIQUE_VIOLATION) {
      return { success: false, message: "You have already left a review" };
    }

    console.error("[createReview] insert failed:", error);
    return { success: false, message: "Error while adding review" };
  }

  revalidatePath("/reviews");

  return {
    success: true,
    message: "Review created successfully",
  };
};