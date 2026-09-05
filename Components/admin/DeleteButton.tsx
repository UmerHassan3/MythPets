"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/Components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/Components/ui/dialog";

type ActionResult = { success: boolean; message: string };

type DeleteButtonProps = {
  /** Server action that removes the record. */
  action: (id: string) => Promise<ActionResult>;
  id: string;
  /** Shown in the confirmation dialog, e.g. "Frost Dragon". */
  label: string;
  /** Extra warning for destructive cascades. */
  description?: string;
};

/**
 * Confirm-then-delete control shared by every admin table.
 *
 * Uses `useTransition` so the row stays interactive while the server action is
 * in flight, then `router.refresh()` to re-render the server tree instead of
 * reloading the whole page.
 */
const DeleteButton = ({ action, id, label, description }: DeleteButtonProps) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await action(id);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${label}`}
            className="text-muted-foreground hover:text-destructive"
          />
        }
      >
        <Trash2 className="size-4" />
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {label}?</DialogTitle>
          <DialogDescription>
            {description ?? "This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter showCloseButton={false}>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteButton;
