import type { ExtensionSecurity } from "../../src/lib/extension/contract";

export type Tone = "positive" | "negative" | "muted";

export function formatPrice(value: number | null): string {
  if (value === null) {
    return "—";
  }

  const digits = Math.abs(value) < 1 ? 4 : 2;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
}

export function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export type ChipView = { text: string; tone: Tone; stopHit: boolean };

/** The chip next to a row: analyst target upside first, then research status, else "No research". */
export function chipView(security: ExtensionSecurity | undefined): ChipView {
  if (!security) {
    return { text: "No research", tone: "muted", stopHit: false };
  }

  const { analystUpside, statusLabel, stopHit } = security;

  if (analystUpside !== null) {
    return analystUpside > 0
      ? { text: `Target ${formatPercent(analystUpside)}`, tone: "positive", stopHit }
      : { text: "Target reached", tone: "muted", stopHit };
  }

  return { text: statusLabel ?? "No research", tone: "muted", stopHit };
}

export type CardRow = { label: string; value: string; note?: string; tone?: Tone };

function targetRow(label: string, target: number | null, upside: number | null): CardRow {
  if (target === null) {
    return { label, value: "—" };
  }

  return {
    label,
    value: formatPrice(target),
    note: upside === null ? undefined : formatPercent(upside),
    tone: upside === null ? undefined : upside > 0 ? "positive" : "muted",
  };
}

/** The rows of the click card, in display order. */
export function cardRows(security: ExtensionSecurity): CardRow[] {
  const rows: CardRow[] = [
    {
      label: security.priceSource === "live" ? "Live price" : "Last price",
      value: formatPrice(security.price),
      note: security.priceSource === "live" || !security.priceDate ? undefined : security.priceDate,
    },
    targetRow("My target", security.myTarget, security.myUpside),
    targetRow("Analyst target", security.analystTarget, security.analystUpside),
  ];

  if (security.accumulationMin !== null || security.accumulationMax !== null) {
    rows.push({
      label: "Buy zone",
      value: `${formatPrice(security.accumulationMin)} – ${formatPrice(security.accumulationMax)}`,
      note: security.inZone ? "Inside" : "Outside",
      tone: security.inZone ? "positive" : "muted",
    });
  }

  if (security.stopPrice !== null) {
    rows.push({
      label: "Stop",
      value: formatPrice(security.stopPrice),
      note: security.stopHit ? "Hit" : "Not hit",
      tone: security.stopHit ? "negative" : "muted",
    });
  }

  if (security.averageBuyPrice !== null) {
    rows.push({ label: "Average cost", value: formatPrice(security.averageBuyPrice) });
  }

  return rows;
}
