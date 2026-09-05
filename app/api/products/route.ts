import { db } from "@/drizzle";
import { products } from "@/Database/schema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const product = await db
      .insert(products)
      .values({
        gameId: body.gameId,
        categoryId: body.categoryId,
        name: body.name,
        price: body.price.toString(),
        salesprice: body.salesprice.toString(),
        image: body.image,
        stock: body.stock,
        isFeatured: body.isFeatured,
        isActive: body.isActive,
      })
      .returning();

    return NextResponse.json(product[0], {
      status: 201,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}