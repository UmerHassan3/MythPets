"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import EditProductForm from "./EditProductForm";

type EditProductDialogProps = {
  productId: string;
  /** Current values, so the form opens populated rather than blank. */
  product: {
    name: string;
    price: string;
    salesprice: string;
    stock: number;
  };
};

export default function EditProductDialog({
  productId,
  product,
}: EditProductDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Base UI uses `render`, not Radix's `asChild`. */}
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${product.name}`}
            className="text-muted-foreground hover:text-foreground"
          />
        }
      >
        <Pencil className="size-4" />
      </DialogTrigger>

      {/* The popup is a centered `fixed` box, so anything taller than the
          viewport gets its top pushed off-screen and becomes unreachable.
          Cap the height and make the *body* the scroll container, so the
          header stays visible and the form can always be scrolled. */}
      <DialogContent className="grid max-h-[88dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            Update the details for {product.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 min-h-0 overflow-y-auto px-4 py-4">
          <EditProductForm
            productId={productId}
            product={product}
            onUpdated={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
