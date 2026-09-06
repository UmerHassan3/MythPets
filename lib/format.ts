/** Shared money formatting. `numeric` columns arrive from drizzle as strings. */
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatPrice = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? currency.format(parsed) : value;
};

/**
 * Sale maths in one place so the card and the detail page can never disagree
 * about whether something is discounted.
 */
export const priceInfo = (price: string, salesPrice: string) => {
  const full = Number(price);
  const sale = Number(salesPrice);
  const onSale = Number.isFinite(sale) && Number.isFinite(full) && sale < full;

  return {
    onSale,
    discount: onSale ? Math.round(((full - sale) / full) * 100) : 0,
    /** Cash saved, pre-formatted — "Save $4.00" lands harder than "-20%". */
    saved: onSale ? currency.format(full - sale) : null,
    /** The price the customer actually pays. */
    effective: onSale ? salesPrice : price,
  };
};
