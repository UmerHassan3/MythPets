/**
 * One description of each asset we accept, shared by the quoting side
 * (rates.ts) and the verifying side (verify.ts).
 *
 * These two must agree exactly: the quote decides the number the customer is
 * told to send, and verification decides whether what arrived matches it. If
 * the decimal handling ever drifted apart, real payments would be rejected.
 */

export type AssetCode = "usdt_bep20" | "ltc";

export const ASSETS = {
  usdt_bep20: {
    label: "USDT",
    /** Decimals in the figure shown to the customer. */
    quoteDecimals: 6,
    /** Base-unit exponent on-chain. USDT on BSC uses 18, not 6. */
    chainDecimals: 18,
    /**
     * The identifying dust is drawn from 1..dustSteps and added at the
     * smallest quoted decimal, so two orders for the same item never carry the
     * same total. Capped so the surcharge stays under ten cents.
     */
    dustSteps: 99_999,
  },
  ltc: {
    label: "LTC",
    quoteDecimals: 8,
    chainDecimals: 8,
    dustSteps: 99_999,
  },
} as const satisfies Record<string, {
  label: string;
  quoteDecimals: number;
  chainDecimals: number;
  dustSteps: number;
}>;

export const isAssetCode = (code: string): code is AssetCode =>
  Object.hasOwn(ASSETS, code);

/**
 * How long a quoted rate stays valid.
 *
 * A locked rate is a promise about a price, so it has to expire — otherwise an
 * order quoted at today's price is still payable at that price next week,
 * after the market has moved.
 */
export const QUOTE_TTL_MINUTES = 30;

/**
 * Parses a decimal string into integer base units.
 *
 * Deliberately string arithmetic: `Number("10.0473") * 1e18` is not exactly
 * representable, and money comparisons must not inherit a float's rounding.
 */
export const toBaseUnits = (value: string, decimals: number): bigint => {
  const [whole, fraction = ""] = value.trim().split(".");
  const padded = (fraction + "0".repeat(decimals)).slice(0, decimals);

  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
};

/** Renders integer base units back to a decimal string, for display only. */
export const fromBaseUnits = (value: bigint, decimals: number): string => {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = (value % divisor).toString().padStart(decimals, "0");

  return `${whole}.${fraction}`.replace(/\.?0+$/, "");
};

/**
 * How far a payment may differ from the quoted total and still be accepted.
 *
 * Zero — matching is exact, and deliberately so. Both chains move exact
 * integer amounts, and the customer is shown the exact figure to send, so
 * there is nothing legitimate for a tolerance to absorb.
 *
 * Any tolerance at all would undermine the dust. At half a dust step, a
 * payment landing midway between two orders' totals satisfies *both* of them,
 * so the amount would no longer identify a single order. Anything that does
 * not match is flagged for an admin rather than rejected, so exactness costs a
 * customer nothing.
 */
export const matchEpsilon = (_code: AssetCode): bigint => 0n;
