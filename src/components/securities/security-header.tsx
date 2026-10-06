import { ArrowLeft, ExternalLink, NotebookPen } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SecurityDetail } from "@/lib/portfolio/securities/queries";
import { findTickertapeUrl } from "@/lib/portfolio/securities/ticker";

export function SecurityHeader({ security, tags, hasResearch }: Pick<SecurityDetail, "security" | "tags"> & { hasResearch: boolean }) {
  const tickertapeUrl = findTickertapeUrl(security);

  return (
    <div className="grid gap-3 pb-6">
      <Link href="/securities" className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Securities
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {security.ticker ? <span className="mr-2">{security.ticker}</span> : null}
            <span className={security.ticker ? "text-muted-foreground font-normal" : undefined}>{security.name}</span>
          </h1>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{security.type === "ETF" ? "ETF" : "Stock"}</Badge>
            {security.ticker ? null : (
              <Badge variant="outline" className="border-warning/50 text-warning">
                No ticker
              </Badge>
            )}
            {tags.map((tag) => (
              <Badge key={tag.id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tickertapeUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={tickertapeUrl} target="_blank" rel="noopener noreferrer">
                Open Tickertape
                <ExternalLink aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link href={`/securities/${security.id}/research`}>
              <NotebookPen aria-hidden="true" />
              {hasResearch ? "Edit research" : "Add research"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
