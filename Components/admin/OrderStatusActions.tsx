"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, PackageCheck, XCircle } from "lucide-react";

import {
  updateOrderStatus,
  type OrderStatus,
} from "@/lib/actions/admin-actions/orders";
import { Button } from "@/Components/ui/button";

/**
 * Only the transitions valid from the current status are rendered — the server
 * enforces the same rules, this just avoids offering a button that will fail.
 */
const NEXT_ACTIONS: Record<
  OrderStatus,
  { status: OrderStatus; label: string; icon: typeof BadgeCheck; variant?: "outline" }[]
> = {
  pending: [
    { status: "paid", label: "Mark paid", icon: BadgeCheck },
    { status: "cancelled", label: "Cancel", icon: XCircle, variant: "outline" },
  ],
  processing: [
    { status: "paid", label: "Confirm payment", icon: BadgeCheck },
    { status: "cancelled", label: "Cancel", icon: XCircle, variant: "outline" },
  ],
  paid: [
    { status: "delivered", label: "Mark delivered", icon: PackageCheck },
    { status: "cancelled", label: "Cancel", icon: XCircle, variant: "outline" },
  ],
  delivered: [],
  cancelled: [],
};

const OrderStatusActions = ({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const actions = NEXT_ACTIONS[status] ?? [];
  if (actions.length === 0) return null;

  const run = (next: OrderStatus) => {
    startTransition(async () => {
      const result = await updateOrderStatus({ orderId, status: next });

      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ status: next, label, icon: Icon, variant }) => (
        <Button
          key={next}
          type="button"
          size="sm"
          variant={variant}
          disabled={isPending}
          onClick={() => run(next)}
          className="gap-1.5"
        >
          <Icon className="size-3.5" />
          {label}
        </Button>
      ))}
    </div>
  );
};

export default OrderStatusActions;
