"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import ReviewForm, { type ReviewGame } from "./ReviewForm";

type ReviewDialogProps = {
  userId: string;
  games: ReviewGame[];
};

const ReviewDialog = ({ userId, games }: ReviewDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Base UI uses `render`, not Radix's `asChild`. */}
      <DialogTrigger render={<Button />}>
        <PenLine className="size-4" />
        Write a review
      </DialogTrigger>

      {/* The popup is centred and fixed, so content taller than the viewport
          would push its top off-screen. Cap the height and scroll the body. */}
      <DialogContent className="grid max-h-[88dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Write a review</DialogTitle>
          <DialogDescription>
            Tell other traders how your order went.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 min-h-0 overflow-y-auto px-4 py-4">
          <ReviewForm
            userId={userId}
            games={games}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
