import Link from "next/link";

import type { SecurityType } from "@/generated/prisma/enums";

type SecurityLabelProps = {
  securityId: string;
  name: string;
  ticker: string | null;
  type: SecurityType;
};

/** Name first, since tickers are optional until the user maps them. */
export function SecurityLabel({ securityId, name, ticker, type }: SecurityLabelProps) {
  return (
    <div className="min-w-0">
      <Link href={`/securities/${securityId}`} className="block truncate text-sm font-medium hover:underline" title={name}>
        {name}
      </Link>
      <p className="text-muted-foreground text-xs">
        {ticker ?? "No ticker"} · {type === "ETF" ? "ETF" : "Stock"}
      </p>
    </div>
  );
}
