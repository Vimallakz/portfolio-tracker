import type { StockSplit } from "@/lib/market-data/yahoo";

/**
 * The combined split ratio between two dates, or null when none happened.
 * A price from `after` divided by the ratio is comparable with one from `upTo`.
 * A split on `after` itself is excluded: that day's price is already at the
 * new share count.
 */
export function splitBetween(splits: StockSplit[], after: string, upTo: string): StockSplit | null {
  const inRange = splits.filter((split) => split.date > after && split.date <= upTo);

  if (inRange.length === 0) {
    return null;
  }

  return {
    date: inRange.at(-1)!.date,
    ratio: inRange.reduce((product, split) => product * split.ratio, 1),
  };
}

/** Converts a pre-split price to the post-split share count. */
export const adjustForSplit = (price: number | null, split: StockSplit | null) =>
  price === null || split === null ? price : price / split.ratio;
