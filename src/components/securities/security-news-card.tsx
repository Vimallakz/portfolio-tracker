import { ExternalLink } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format/date";
import type { NewsItem } from "@/lib/market-data/finnhub";

type SecurityNewsCardProps =
  | { state: "ok"; news: NewsItem[] }
  | { state: "no-key" }
  | { state: "no-ticker" };

export function SecurityNewsCard(props: SecurityNewsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest news</CardTitle>
        <CardDescription>
          {props.state === "ok"
            ? "Company headlines from the last two weeks, via Finnhub."
            : props.state === "no-ticker"
              ? "Map a ticker to see company news."
              : "Add a free FINNHUB_API_KEY to the server environment to see company news."}
        </CardDescription>
      </CardHeader>
      {props.state === "ok" ? (
        <CardContent>
          {props.news.length === 0 ? (
            <p className="text-muted-foreground text-sm">No headlines in the last two weeks.</p>
          ) : (
            <ul className="divide-y">
              {props.news.map((item) => (
                <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group hover:text-primary flex items-start gap-1.5 text-sm font-medium"
                  >
                    <span className="line-clamp-2">{item.headline}</span>
                    <ExternalLink className="text-muted-foreground mt-0.5 size-3 shrink-0 opacity-0 group-hover:opacity-100" aria-hidden="true" />
                  </a>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {item.source ? `${item.source} · ` : ""}
                    <time dateTime={item.publishedAt}>{formatRelativeTime(item.publishedAt)}</time>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}
