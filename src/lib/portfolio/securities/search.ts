type Searchable = { name: string; ticker: string | null };

/** Lower is better; null means no match. Ticker hits beat name hits, prefixes beat substrings. */
function rank(item: Searchable, query: string): number | null {
  const ticker = item.ticker?.toLowerCase() ?? "";
  const name = item.name.toLowerCase();

  if (ticker === query) return 0;
  if (ticker.startsWith(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (name.split(/\s+/).some((word) => word.startsWith(query))) return 3;
  if (ticker.includes(query) || name.includes(query)) return 4;
  return null;
}

/** Matches for the query, best first; the input order breaks ties. An empty query returns everything. */
export function searchSecurities<T extends Searchable>(items: T[], query: string): T[] {
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) return items;

  return items
    .map((item, index) => ({ item, index, score: rank(item, trimmed) }))
    .filter((entry): entry is { item: T; index: number; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.item);
}
