'use server'

import { categories } from "@/Database/schema";
import { db } from "@/drizzle";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type CategoryParams = {
    name: string,
    gameid: string,
}
export const createCategory = async (params: CategoryParams) => {
    const { name, gameid } = params;
    if(!name || !gameid) {
        return {
            success: false,
            message: "Name and Game ID are required"
        }
    }

    const existingCategory = await db
        .select()
        .from(categories)
        .where(
            and(
                eq(categories.name, name),
                eq(categories.gameId, gameid),
            ),
        )
        .limit(1);
    if(existingCategory.length > 0) {
        return {
            success: false,
            message: "Category already exists"
        }
    }

    const category = await db.insert(categories).values({
        name:name,
        gameId:gameid,
    }).returning();
    if(category.length === 0) {
        return {
            success: false,
            message: "Failed to create category"
        }
    }

    revalidatePath(`/admin/games/${gameid}`);
    return {
        success: true,
        message: "Category created successfully",
        category: category[0]
    }

}

export const deleteCategory = async (id: string) => {
    const categoryId = id;
    if(!categoryId) {
        return {
            success: false,
            message: "Category ID is required"
        }
    }

    const category = await db.delete(categories).where(eq(categories.id, categoryId)).returning();
    if(category.length === 0) {
        return {
            success: false,
            message: "Category not found"
        }
    }

    revalidatePath(`/admin/games/${category[0].gameId}`);
    return {
        success: true,
        message: "Category deleted successfully",
    }
}