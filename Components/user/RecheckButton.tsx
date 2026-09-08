"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import { recheckPayment } from "@/lib/actions/user-actions/order";
import { Button } from "@/Components/ui/button";

/**
 * Re-runs on-chain verification for an order already holding a transaction.
 *
 * The first submission almost always arrives before the required
 * confirmations exist, so this is the normal path to a confirmed order rather
 * than an error recovery: the customer pays, submits, waits a minute, checks.
 */
const RecheckButton = ({ orderId }: { orderId: string }) => {
  const [checking, setChecking] = useState(false);
  const router = useRouter();

  const run = async () => {
    setChecking(true);

    const result = await recheckPayment(orderId);

    if (result.success) {
      toast.success(result.message);
    } else if (result.pending) {
      // Still settling — not a failure, so it must not read like one.
      toast.info(result.message);
    } else {
      toast.error(result.message);
    }

    router.refresh();
    setChecking(false);
  };

  return (
    <Button
      type="button"
      variant="outline"
      disabled={checking}
      onClick={run}
      className="gap-2"
    >
      <RefreshCw className={checking ? "size-4 animate-spin" : "size-4"} />
      {checking ? "Checking…" : "Check payment status"}
    </Button>
  );
};

export default RecheckButton;
