'use server'

import { products } from "@/Database/schema";
import { db } from "@/drizzle";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ProductParams = {
    name: string;
    gameId: string;
    categoryId: string;
    price: string;
    salesprice: string;
    image: string;
    stock: number;
    isFeatured: boolean;
    isActive: boolean;
}
export const addProduct = async(params:ProductParams)=>{
    const { name, gameId, categoryId, price, salesprice, image, stock, isFeatured, isActive } = params;
    if(!name || !gameId || !categoryId || !price || !salesprice || !image || stock === undefined || isFeatured === undefined || isActive === undefined){
        return {
            success: false,
            message: "All fields are required"
        }
    }
    const product = await db.insert(products).values({
        name,
        gameId:gameId,
        categoryId:categoryId,
        price,
        salesprice,
        image,
        stock,
        isFeatured,
        isActive
    });
    if(!product){
        return {
            success: false,
            message: "Error creating product"
        }
    }
    return {
        success: true,
        message: "Product created successfully"
    };
}

export const deleteProduct = async(id:string)=>{
    const productid = id;
    if(!productid){
        return {
            success: false,
            message: "Product id is required"
        }
    }
    const product = await db.delete(products).where(eq(products.id,productid)).returning();
    if(product.length === 0){
        return{
            success: false,
            message: "Product not found"
        }
    }

    const { gameId, categoryId } = product[0];
    revalidatePath(`/admin/games/${gameId}/${categoryId}`);

    return{
        success: true,
        message: "Product deleted successfully"
    }
}

type updateParams = {
    id: string;
    name?: string;
    price?: string;
    salesprice?: string;
    stock?: number;
    isFeatured?: boolean;
    isActive?: boolean;
}
export const updateProduct = async(params: updateParams)=>{
    const { id, name, price, salesprice, stock, isFeatured, isActive } = params;
    if(!id){
        return {
            success: false,
            message: "Product id is required"
        }
    } 
    // Drizzle omits `undefined` keys from the SET clause, so an all-undefined
    // update would produce invalid SQL. Bail out before that happens.
    const changes = { name, price, salesprice, stock, isFeatured, isActive };
    if (Object.values(changes).every((value) => value === undefined)) {
        return {
            success: false,
            message: "Nothing to update"
        }
    }

    const updatedProduct = await db.update(products)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

    if(updatedProduct.length === 0){
        return {
            success: false,
            message: "Product not found"
        }
    }

    const { gameId, categoryId } = updatedProduct[0];
    revalidatePath(`/admin/games/${gameId}/${categoryId}`);

    return {
        success: true,
        message: "Product updated successfully"
    }
}

