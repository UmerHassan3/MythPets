"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Timer, TriangleAlert } from "lucide-react";

import { submitTransactionHash } from "@/lib/actions/user-actions/order";
import { useCart } from "@/lib/cart/cart-context";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";

type PaymentPanelProps = {
  orderId: string;
  address: string;
  network: string;
  /** Exact figure in the payment asset, locked when the order was created. */
  amount: string | null;
  asset: string | null;
  /** ISO timestamp at which the quoted rate stops being honoured. */
  expiresAt: string | null;
  /** Pre-rendered on the server so no QR library reaches the browser. */
  qrDataUrl: string;
};

/** Formats a remaining duration as m:ss. */
const countdown = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const PaymentPanel = ({
  orderId,
  address,
  network,
  amount,
  asset,
  expiresAt,
  qrDataUrl,
}: PaymentPanelProps) => {
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const { clear } = useCart();
  const router = useRouter();

  // Ticks only while there is something to count down to. Computed from the
  // server's timestamp rather than a duration, so a slow page load or a
  // backgrounded tab cannot make the window look longer than it is.
  useEffect(() => {
    if (!expiresAt) return;

    const deadline = new Date(expiresAt).getTime();
    const tick = () => setRemaining(deadline - Date.now());

    tick();
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const expired = remaining !== null && remaining <= 0;

  const copy = async (text: string, field: "address" | "amount") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard is blocked in some contexts; both values are selectable.
      toast.error("Could not copy — select the text manually");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const result = await submitTransactionHash({ orderId, txHash });

    if (result.success) {
      toast.success(result.message);
      // Safe to empty now: the order holds its own snapshot of the items.
      clear();
      router.refresh();
      return;
    }

    // `pending` means the transaction is real but not yet settled. Refreshing
    // moves the page to the waiting state, where the customer can re-check —
    // the important thing is that they are never told to pay again.
    if (result.pending) {
      toast.info(result.message);
      clear();
      router.refresh();
      return;
    }

    toast.error(result.message);
    setSubmitting(false);
  };

  if (expired) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
          <Timer className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-700">This quote has expired</p>
            <p className="mt-1 text-amber-700/80">
              Crypto prices move, so a quoted amount is only held for a short
              window. Nothing has been charged — place the order again to get a
              fresh quote.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Already sent the payment? Don&apos;t send it again — contact us and
          we&apos;ll match it to your order manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* The single most expensive mistake a customer can make. */}
      <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div className="text-sm">
          <p className="font-medium text-amber-700">Send on {network} only</p>
          <p className="mt-1 text-amber-700/80">
            Funds sent on any other network cannot be recovered.
          </p>
        </div>
      </div>

      {amount && asset ? (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Amount to send</p>

            {remaining !== null ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                <Timer className="size-3.5" />
                Rate held for {countdown(remaining)}
              </p>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {amount}{" "}
              <span className="text-base text-muted-foreground">{asset}</span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copy(amount, "amount")}
              className="gap-2"
            >
              {copied === "amount" ? (
                <>
                  <Check className="size-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy amount
                </>
              )}
            </Button>
          </div>

          {/* The trailing digits are what identify this order among all the
              payments arriving at a shared address, so "roughly right" is not
              good enough and the customer needs to know that. */}
          <p className="mt-2 text-xs text-muted-foreground">
            Send this exact amount, including the final digits — it is how we
            recognise your payment.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-start">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URI */}
        <img
          src={qrDataUrl}
          alt={`QR code for the ${network} payment address`}
          width={160}
          height={160}
          className="size-40 shrink-0 rounded-lg bg-white p-2 ring-1 ring-border"
        />

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">Payment address</p>

          <p className="rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all select-all">
            {address}
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copy(address, "address")}
            className="gap-2"
          >
            {copied === "address" ? (
              <>
                <Check className="size-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copy address
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Exchanges deduct their withdrawal fee from the amount sent, so the
          figure that arrives is not the figure the customer entered. That lands
          as a mismatch and needs a human, which is worth one line to avoid. */}
      <p className="text-xs text-muted-foreground">
        Send from a personal wallet where possible. Exchange withdrawals deduct
        a fee from the amount, which means less arrives than the order expects
        and confirmation has to be done by hand.
      </p>

      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor="tx-hash" className="text-sm font-medium">
          Transaction ID
        </label>
        <Input
          id="tx-hash"
          value={txHash}
          onChange={(event) => setTxHash(event.target.value)}
          placeholder="0x… or your wallet's transaction ID"
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Paste this from your wallet after sending. We verify it on-chain
          before delivering.
        </p>

        <Button
          type="submit"
          size="lg"
          disabled={submitting || txHash.trim().length < 26}
          className="mt-2 w-full"
        >
          {submitting ? "Verifying…" : "I've sent the payment"}
        </Button>
      </form>
    </div>
  );
};

export default PaymentPanel;
