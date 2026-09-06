"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/Components/ui/button";
import { useCart } from "@/lib/cart/cart-context";
import { cn } from "@/lib/utils";

type AddToCartButtonProps = {
  productId: string;
  name: string;
  stock: number;
  className?: string;
  size?: "sm" | "default" | "lg";
};

/**
 * A deliberately small client island so `ProductCard` and the product page can
 * stay Server Components — only this button needs JavaScript, not the tile
 * around it.
 */
const AddToCartButton = ({
  productId,
  name,
  stock,
  className,
  size = "default",
}: AddToCartButtonProps) => {
  const { add } = useCart();
  const router = useRouter();

  if (stock <= 0) {
    return (
      <Button className={cn("w-full", className)} size={size} disabled>
        Sold out
      </Button>
    );
  }

  const handleAdd = () => {
    const outcome = add(productId, { max: stock });

    // Already holding every unit in stock — say so rather than silently
    // doing nothing.
    if (outcome === "max") {
      toast.error(`That's all we have`, {
        description: `Only ${stock} of ${name} in stock.`,
      });
      return;
    }

    toast.success(
      outcome === "increased" ? `Added another ${name}` : `${name} added to cart`,
      {
        description: "You can visit the cart to checkout.",
        action: {
          label: "View cart",
          onClick: () => router.push("/cart"),
        },
      },
    );
  };

  return (
    <Button
      type="button"
      size={size}
      onClick={handleAdd}
      aria-label={`Add ${name} to cart`}
      className={cn("gap-2", className)}
    >
      <ShoppingCart className="size-4" />
      Add to cart
    </Button>
  );
};

export default AddToCartButton;
