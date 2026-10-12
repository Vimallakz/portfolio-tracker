/**
 * Everything that depends on Tickertape's markup lives here, so a redesign is a one-file fix.
 *
 * Seen on tickertape.in (Oct 2026):
 * - US portfolio: /portfolio/us-stocks (single-page app; rows render after load).
 * - Stock links: /us-stocks/nu-holdings-ltd-NU-share-price, older ones /us-stocks/NU.
 * - Stock page: the name is an <h1>, rendered twice (mobile and desktop layouts).
 */

/** Pages whose stock rows get a chip. */
export const LIST_PAGE = /^\/portfolio\/us-stocks/;
/** A single stock page, e.g. /us-stocks/nu-holdings-ltd-NU-share-price. */
export const STOCK_PAGE = /^\/us-stocks\/[^/]+\/?$/;

export const STOCK_LINK = 'a[href*="/us-stocks/"]';
export const STOCK_TITLE = "h1";
/** The closest of these around a link counts as one row, so a logo and a name link share one chip. */
export const ROW = 'tr, li, [role="row"]';

/** The ticker in a Tickertape US stock path, uppercased, or null when the path is not a stock. */
export function slugFromPath(pathname: string): string | null {
  const segment = pathname.match(/^\/us-stocks\/([^/?#]+)\/?$/)?.[1];

  if (!segment) {
    return null;
  }

  const named = segment.match(/-([A-Za-z0-9.]+)-share-price$/);

  if (named) {
    return named[1].toUpperCase();
  }

  // Bare tickers are uppercase; lowercase segments are section pages like /us-stocks/screener.
  return /^[A-Z0-9.]+$/.test(segment) ? segment : null;
}

/** The ticker a link points to, or null for links that are not stock pages. */
export function slugFromHref(href: string): string | null {
  try {
    return slugFromPath(new URL(href, "https://www.tickertape.in").pathname);
  } catch {
    return null;
  }
}
