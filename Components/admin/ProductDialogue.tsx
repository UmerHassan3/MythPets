"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import ProductAddForm from "./ProductAddForm";

interface ProductDialogProps {
  gameId: string;
  categoryId: string;
}

export default function ProductDialogue({
  gameId,
  categoryId,
}: ProductDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Base UI uses `render`, not Radix's `asChild`. */}
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Add product
      </DialogTrigger>

      {/* The popup is a centered `fixed` box, so anything taller than the
          viewport gets its top pushed off-screen and becomes unreachable.
          Cap the height and make the *body* the scroll container, so the
          header stays visible and the form can always be scrolled. */}
      <DialogContent className="grid max-h-[88dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add product</DialogTitle>
          <DialogDescription>
            Add a product to this category.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 min-h-0 overflow-y-auto px-4 py-4">
          <ProductAddForm
            gameId={gameId}
            categoryId={categoryId}
            onCreated={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
