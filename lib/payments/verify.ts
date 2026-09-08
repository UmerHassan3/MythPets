// Server-only: this module reads secrets and must never reach the browser.

import {
  ASSETS,
  fromBaseUnits,
  isAssetCode,
  matchEpsilon,
  toBaseUnits,
  type AssetCode,
} from "./assets";

/**
 * On-chain verification for the wallets we accept.
 *
 * This is what replaces a payment processor: rather than an admin reading a
 * block explorer, the server queries the chain itself and decides. It runs
 * inside a normal request (a server action), so no background worker is
 * needed — which matters on serverless, where nothing runs between requests.
 *
 * The receiving address is public, so anyone can watch payments arrive on it.
 * Three independent facts therefore have to hold before an order is paid:
 *
 *   1. the amount matches this order's unique total, down to the dust digit;
 *   2. the transaction is newer than the order it is claimed against;
 *   3. the hash has not already been used (enforced by a unique index).
 *
 * Any one of these alone is bypassable. Together they mean a hash copied off
 * the public explorer cannot be redeemed against somebody else's order.
 */

/** Official BEP-20 USDT contract. Anyone can deploy a token called "USDT". */
const USDT_BEP20_CONTRACT = "0x55d398326f99059ff775485246999027b3197955";

/** ERC-20/BEP-20 Transfer(address,address,uint256). */
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/** Below this, a transaction is treated as not yet settled. */
const MIN_CONFIRMATIONS = { usdt_bep20: 12, ltc: 2 } as const;

/** Clock-skew allowance when checking a transaction is newer than its order. */
const TIMESTAMP_GRACE_MS = 2 * 60_000;

/**
 * What should happen to the order when verification does not pass.
 *
 * These are three genuinely different situations, and treating them alike
 * either loses somebody's money or lets an order be claimed for free:
 *
 * - `retry`   nothing is wrong yet — unconfirmed, or the explorer is down.
 *             Keep the hash claimed so nobody else can take it, and let the
 *             customer check again.
 * - `release` this hash is not a payment to us. Free it so the customer can
 *             submit the right one.
 * - `flag`    real funds reached our wallet but do not match the order. Never
 *             released: the money is ours and somebody is owed something, so
 *             it goes to an admin instead of being dropped.
 */
export type Disposition = "retry" | "release" | "flag";

export type VerificationResult =
  | { ok: true; amount: string; note: string }
  | { ok: false; reason: string; disposition: Disposition };

const fail = (reason: string, disposition: Disposition): VerificationResult => ({
  ok: false,
  reason,
  disposition,
});

/** Times out rather than hanging a checkout on a slow explorer. */
const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(12_000),
    // Verification must never be served from a cache.
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Explorer responded ${response.status}`);
  }

  return response.json();
};

/**
 * BNB Smart Chain nodes, tried in order.
 *
 * These are ordinary JSON-RPC endpoints rather than a block explorer's API.
 * That is deliberate on two counts: the chain itself is the authority, and an
 * explorer's index is a second-hand copy of it; and none of these need an API
 * key or a paid plan, so verification cannot stop working because a quota ran
 * out or a provider changed its pricing.
 *
 * The list exists so one node being down or rate-limiting never blocks a
 * customer's payment.
 */
const BSC_NODES = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
];

/**
 * Calls a JSON-RPC method, moving to the next node on failure.
 *
 * Throws only when every node has failed, which the caller turns into a
 * retryable result — a payment is never rejected because we could not read the
 * chain.
 */
const bscRpc = async (method: string, params: unknown[]): Promise<unknown> => {
  let lastError: unknown;

  for (const url of BSC_NODES) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Node responded ${response.status}`);
      }

      const payload = (await response.json()) as {
        result?: unknown;
        error?: { message?: string };
      };

      if (payload.error) {
        throw new Error(payload.error.message ?? "RPC error");
      }

      return payload.result;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("All BSC nodes failed");
};

/**
 * Narrows an RPC result that is required to be an object.
 *
 * A node returns `null` for a transaction it has not seen, and a misbehaving
 * one can return a string. Read naively, `result.status !== "0x1"` would then
 * look exactly like a failed transaction and release a perfectly good order,
 * so anything that is not an object is treated as "cannot read yet".
 */
const rpcObject = (result: unknown): Record<string, unknown> | null =>
  result !== null && typeof result === "object"
    ? (result as Record<string, unknown>)
    : null;

type ChainPayment = {
  /** Total received by us in this transaction, in base units. */
  received: bigint;
  confirmations: number;
  /** When the containing block was mined. */
  minedAt: Date;
};

/**
 * BEP-20 USDT on BNB Smart Chain, read straight from the chain.
 *
 * Reads the transfer logs rather than the transaction value: a token transfer
 * moves no BNB, so the value field is zero and tells us nothing.
 */
const readBep20 = async (
  txHash: string,
  toAddress: string,
): Promise<ChainPayment | VerificationResult> => {
  const receipt = rpcObject(
    await bscRpc("eth_getTransactionReceipt", [txHash]),
  );

  if (!receipt) {
    return fail("Transaction not found on BNB Smart Chain yet", "retry");
  }

  if (receipt.status !== "0x1") {
    return fail("That transaction failed on-chain", "release");
  }

  const logs = (receipt.logs ?? []) as {
    address?: string;
    topics?: string[];
    data?: string;
  }[];

  // Every matching transfer is summed. One transaction can carry more than a
  // single transfer to the same address, and taking only the first would
  // under-count a legitimate payment.
  const received = logs
    .filter(
      (log) =>
        log.address?.toLowerCase() === USDT_BEP20_CONTRACT &&
        log.topics?.[0]?.toLowerCase() === TRANSFER_TOPIC &&
        // topics[2] is the indexed recipient, left-padded to 32 bytes.
        log.topics?.[2]
          ?.toLowerCase()
          .endsWith(toAddress.toLowerCase().replace(/^0x/, "")),
    )
    .reduce((sum, log) => sum + BigInt(log.data || "0x0"), 0n);

  if (received === 0n) {
    return fail(
      "No USDT (BEP-20) transfer to our address in that transaction",
      "release",
    );
  }

  const blockNumber = receipt.blockNumber as string | undefined;

  if (!blockNumber) {
    return fail("That transaction is not in a block yet", "retry");
  }

  // Independent of one another, so one round-trip of latency rather than two.
  const [latestResult, blockResult] = await Promise.all([
    bscRpc("eth_blockNumber", []),
    bscRpc("eth_getBlockByNumber", [blockNumber, false]),
  ]);

  const latest = typeof latestResult === "string" ? latestResult : undefined;
  const block = rpcObject(blockResult);

  if (!latest || !block?.timestamp) {
    return fail("Could not confirm the transaction — try again shortly", "retry");
  }

  return {
    received,
    confirmations: Number(BigInt(latest) - BigInt(blockNumber)),
    minedAt: new Date(Number(BigInt(block.timestamp as string)) * 1000),
  };
};

/** Litecoin, via the Blockchair API. Needs no key. */
const readLitecoin = async (
  txHash: string,
  toAddress: string,
): Promise<ChainPayment | VerificationResult> => {
  const payload = (await fetchJson(
    `https://api.blockchair.com/litecoin/dashboards/transaction/${txHash}`,
  )) as {
    context?: { state?: number };
    data?: Record<
      string,
      {
        transaction?: { block_id?: number; time?: string };
        outputs?: { recipient?: string; value?: number }[];
      }
    >;
  };

  const entry = payload.data?.[txHash];

  if (!entry?.transaction) {
    return fail("Transaction not found on the Litecoin network yet", "retry");
  }

  // block_id is -1 while the transaction is still in the mempool.
  const blockId = entry.transaction.block_id ?? -1;

  if (blockId <= 0) {
    return fail(
      "Waiting for the transaction to confirm — check again shortly",
      "retry",
    );
  }

  // Sum every output paying us: wallets routinely split across outputs.
  const received = (entry.outputs ?? [])
    .filter((output) => output.recipient === toAddress)
    .reduce((sum, output) => sum + BigInt(output.value ?? 0), 0n);

  if (received === 0n) {
    return fail("That transaction did not pay our Litecoin address", "release");
  }

  // Blockchair reports block times in UTC, without a zone marker.
  const minedAt = new Date(`${entry.transaction.time?.replace(" ", "T")}Z`);

  return {
    received,
    // `context.state` is the chain tip height.
    confirmations: Math.max(0, (payload.context?.state ?? blockId) - blockId + 1),
    minedAt: Number.isNaN(minedAt.getTime()) ? new Date(0) : minedAt,
  };
};

/**
 * Verifies that `txHash` is this order's payment.
 *
 * `expectedAmount` is the figure locked onto the order at creation, dust
 * included — never a fresh conversion.
 */
export const verifyPayment = async (params: {
  methodCode: string;
  txHash: string;
  toAddress: string;
  expectedAmount: string;
  /** The order's creation time; the payment has to be newer than this. */
  orderCreatedAt: Date;
}): Promise<VerificationResult> => {
  const { methodCode, txHash, toAddress, expectedAmount, orderCreatedAt } =
    params;

  // An unrecognised method has no verifier, so it can never be auto-confirmed.
  // Flagged rather than released: if funds were sent, they still arrived.
  if (!isAssetCode(methodCode)) {
    return fail("This payment method cannot be verified automatically", "flag");
  }

  const code: AssetCode = methodCode;
  const { chainDecimals, label } = ASSETS[code];

  let payment: ChainPayment | VerificationResult;

  try {
    payment =
      code === "usdt_bep20"
        ? await readBep20(txHash, toAddress)
        : await readLitecoin(txHash, toAddress);
  } catch (error) {
    console.error("[verify] lookup failed:", error);
    return fail(
      "Could not reach the blockchain explorer — try again shortly",
      "retry",
    );
  }

  if ("ok" in payment) return payment;

  const { received, confirmations, minedAt } = payment;

  // Guard 2: a transaction older than the order cannot be its payment. This is
  // what stops an existing payment being copied off the public explorer and
  // redeemed against a newly created order.
  if (minedAt.getTime() + TIMESTAMP_GRACE_MS < orderCreatedAt.getTime()) {
    return fail("That transaction was made before this order existed", "release");
  }

  // Guard 1: the amount must match this order's unique total. Compared in
  // integer base units, so no float ever touches the decision.
  const expected = toBaseUnits(expectedAmount, chainDecimals);
  const epsilon = matchEpsilon(code);
  const difference = received - expected;

  if (difference < -epsilon || difference > epsilon) {
    const actual = fromBaseUnits(received, chainDecimals);

    // Funds did arrive, so this is never released: somebody has paid us the
    // wrong amount and is owed either goods or a refund.
    return fail(
      difference < 0n
        ? `We received ${actual} ${label} but this order is for ${expectedAmount} ${label}. Our team will review it and get back to you.`
        : `We received ${actual} ${label}, more than the ${expectedAmount} ${label} this order is for. Our team will review it and get back to you.`,
      "flag",
    );
  }

  if (confirmations < MIN_CONFIRMATIONS[code]) {
    return fail(
      `Payment found — waiting for confirmations (${confirmations}/${MIN_CONFIRMATIONS[code]}). Check again in a minute.`,
      "retry",
    );
  }

  const amount = fromBaseUnits(received, chainDecimals);

  return {
    ok: true,
    amount,
    note: `${amount} ${label} · ${confirmations} confirmations`,
  };
};
