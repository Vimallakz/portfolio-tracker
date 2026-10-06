/**
 * Lookup key for SecurityAlias.normalizedName. Tickertape exports are not
 * consistent about case or spacing, so "Grab  Holdings" and "GRAB HOLDINGS"
 * must resolve to the same alias.
 */
export function normalizeSecurityName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
