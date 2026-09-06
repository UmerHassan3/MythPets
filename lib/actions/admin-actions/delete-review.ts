'use server'

import { reviews } from "@/Database/schema";
import { db } from "@/drizzle";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type DeleteProps = {
    id: string;
}

export const deleteReview = async (params: DeleteProps) => {
    const { id } = params;

    if (!id) {
        return {
            success: false,
            message: "Id is required"
        }
    }

    try {
        // `.returning()` is what makes the "not found" case detectable — without
        // it the result is a command object that is always truthy, so a delete
        // of a non-existent id would report success.
        const deletedReview = await db
            .delete(reviews)
            .where(eq(reviews.id, id))
            .returning();

        if (deletedReview.length === 0) {
            return {
                success: false,
                message: "Review not found"
            }
        }
    } catch (error) {
        console.error("[deleteReview] failed:", error);
        return {
            success: false,
            message: "Error occured in deleting the review"
        }
    }

    // Both the admin list and the public pages that show reviews.
    revalidatePath("/admin/manage-reviews");
    revalidatePath("/reviews");
    revalidatePath("/");

    return {
        success: true,
        message: "Review Deleted Successfully"
    }
}
