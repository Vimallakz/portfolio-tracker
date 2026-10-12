import { Money } from "@/components/currency/money";
import { LocalDateTime } from "@/components/shared/local-date-time";
import type { LiveQuote } from "@/lib/market-data/finnhub";

export function LivePrice({ quote }: { quote: LiveQuote }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">Live</span>{" "}
      <span className="font-semibold tabular-nums">
        <Money value={quote.price} />
      </span>{" "}
      <span className="text-muted-foreground text-xs">
        · <LocalDateTime iso={quote.asOf} />
      </span>
    </p>
  );
}
