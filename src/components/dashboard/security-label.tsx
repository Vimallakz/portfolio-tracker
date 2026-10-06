import type { SecurityType } from "@/generated/prisma/enums";

/** Name first, since tickers are optional until the user maps them. */
export function SecurityLabel({ name, ticker, type }: { name: string; ticker: string | null; type: SecurityType }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium" title={name}>
        {name}
      </p>
      <p className="text-muted-foreground text-xs">
        {ticker ?? "No ticker"} · {type === "ETF" ? "ETF" : "Stock"}
      </p>
    </div>
  );
}
