'use server'

import { db } from "@/drizzle";

import { games } from "@/Database/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";


type GameParams = {
    name: string;
    image: string;
}
export const createGame= async(params:GameParams)=>{
    const { name, image } = params;
    if(!name || !image){
        return {
            success: false,
            message: "Name and image are required"
        }
    }

    const game = await db.insert(games).values({
        name,
        image,}).returning();

        if(game.length === 0){
            return{
                success: false,
                message: "Error creating game"
            }
        }
        revalidatePath("/admin/games");
        revalidatePath("/admin/dashboard");
        return{
            success: true,
            message: "Game created successfully",
        }
}


export const deleteGame = async(id:string)=>{
    const gameid = id;
    if(!gameid){
        return {
            success: false,
            message: "Game id is required"
        }
    }

    const game = await db.delete(games).where(eq(games.id,gameid)).returning();
    if(game.length === 0){
        return{
            success: false,
            message: "Game not found"
        }
    }
    revalidatePath("/admin/games");
    revalidatePath("/admin/dashboard");
    return{
        success: true,
        message: "Game deleted successfully",
    }
}