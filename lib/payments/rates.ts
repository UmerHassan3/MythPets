// Server-only: called from server actions when an order is created.

import { randomInt } from "node:crypto";

import {
  ASSETS,
  isAssetCode,
  QUOTE_TTL_MINUTES,
  toBaseUnits,
  type AssetCode,
} from "./assets";

/**
 * Converts an order total in USD into the exact amount of crypto to send.
 *
 * Two jobs, and the second is the security-critical one:
 *
 * 1. An order is priced in dollars but settles on a chain, so a rate is looked
 *    up once and written onto the order. Verification compares against that
 *    stored figure, never a fresh lookup — otherwise a payment could fail
 *    simply because the market moved while the customer was confirming it.
 *
 * 2. Every order gets a distinct total. Because the receiving address is
 *    public, anyone can watch it and see payments arrive; identifying dust is
 *    what stops one customer's payment from satisfying a different order.
 */

/** CoinGecko ids for the assets we quote. USDT is pegged and skipped. */
const COINGECKO_IDS: Record<AssetCode, string | null> = {
  usdt_bep20: null,
  ltc: "litecoin",
};

/**
 * Covers the spread between quoting and the customer actually sending. Without
 * it a dip of a fraction of a percent leaves every order short.
 */
const RATE_BUFFER = 1.01;

export type Quote = {
  /** Exact amount in the payment asset, as a fixed-point string. */
  amount: string;
  /** Human label for the asset, e.g. "USDT" or "LTC". */
  asset: string;
  /** When this quoted rate stops being honoured. */
  expiresAt: Date;
};

export type QuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; reason: string };

const fetchUsdPrice = async (coingeckoId: string): Promise<number | null> => {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(8_000), cache: "no-store" },
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as Record<
      string,
      { usd?: number } | undefined
    >;

    const price = payload[coingeckoId]?.usd;

    return typeof price === "number" && price > 0 ? price : null;
  } catch (error) {
    console.error("[rates] price lookup failed:", error);
    return null;
  }
};

/**
 * Adds the identifying dust at the smallest quoted decimal.
 *
 * Done in integer base units so the addition cannot round: at eight decimal
 * places, float arithmetic would corrupt the very digits that make the total
 * unique.
 */
const withDust = (base: string, code: AssetCode): string => {
  const { quoteDecimals } = ASSETS[code];

  // randomInt is drawn from the CSPRNG — a predictable total would let someone
  // work out another order's amount rather than having to guess it.
  const dust = BigInt(randomInt(1, ASSETS[code].dustSteps + 1));
  const total = toBaseUnits(base, quoteDecimals) + dust;

  const divisor = 10n ** BigInt(quoteDecimals);

  return `${total / divisor}.${(total % divisor)
    .toString()
    .padStart(quoteDecimals, "0")}`;
};

/**
 * Quotes an order. Fails closed: if the rate cannot be fetched, no order is
 * created rather than one the customer could underpay.
 */
export const quotePayment = async (
  methodCode: string,
  totalUsd: number,
): Promise<QuoteResult> => {
  if (!isAssetCode(methodCode)) {
    return { ok: false, reason: "That payment method is not available" };
  }

  const expiresAt = new Date(Date.now() + QUOTE_TTL_MINUTES * 60_000);
  const { label, quoteDecimals } = ASSETS[methodCode];

  // A dollar-pegged stablecoin needs no conversion, and no external call.
  if (methodCode === "usdt_bep20") {
    return {
      ok: true,
      quote: {
        amount: withDust(totalUsd.toFixed(quoteDecimals), methodCode),
        asset: label,
        expiresAt,
      },
    };
  }

  const price = await fetchUsdPrice(COINGECKO_IDS[methodCode]!);

  if (price === null) {
    return {
      ok: false,
      reason: "Could not fetch the live rate — please try again in a moment",
    };
  }

  return {
    ok: true,
    quote: {
      amount: withDust(
        ((totalUsd / price) * RATE_BUFFER).toFixed(quoteDecimals),
        methodCode,
      ),
      asset: label,
      expiresAt,
    },
  };
};
