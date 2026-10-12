/**
 * The JSON shapes /api/extension/* returns. The Chrome extension imports this
 * file too, so it must stay type-only with no imports.
 */

export type ExtensionProfile = { id: string; name: string };

export type ExtensionLoginResponse = {
  token: string;
  /** ISO timestamp. */
  expiresAt: string;
  user: { email: string; name: string | null };
  profiles: ExtensionProfile[];
};

export type ExtensionProfilesResponse = { profiles: ExtensionProfile[] };

export type ExtensionSecurity = {
  securityId: string;
  /** Tickertape's slug (tickertapeTicker, else ticker), uppercased; how rows on Tickertape are matched. */
  slug: string;
  ticker: string | null;
  name: string;
  isHeld: boolean;
  status: string | null;
  statusLabel: string | null;
  conviction: string | null;
  convictionLabel: string | null;
  /** Null for researched securities with no live quote and no snapshot price. */
  price: number | null;
  priceSource: "live" | "snapshot" | null;
  /** ISO date of the price. */
  priceDate: string | null;
  averageBuyPrice: number | null;
  myTarget: number | null;
  /** % from price to my target. */
  myUpside: number | null;
  analystTarget: number | null;
  /** % from price to the analyst target. */
  analystUpside: number | null;
  accumulationMin: number | null;
  accumulationMax: number | null;
  inZone: boolean;
  stopPrice: number | null;
  stopHit: boolean;
  signals: { title: string; tone: "positive" | "negative" | "neutral" }[];
  /** The security's page in the app. */
  url: string;
};

export type ExtensionSecuritiesResponse = {
  profile: ExtensionProfile;
  /** ISO timestamp. */
  generatedAt: string;
  securities: ExtensionSecurity[];
};

export type ExtensionErrorResponse = { error: string };
