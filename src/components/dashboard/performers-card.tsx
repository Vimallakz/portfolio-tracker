import { Money } from "@/components/currency/money";
import { SecurityLabel } from "@/components/dashboard/security-label";
import { SignedValue } from "@/components/shared/signed-value";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercentage } from "@/lib/format/number";
import type { HoldingPerformance } from "@/lib/portfolio/analytics/dashboard";

type PerformersCardProps = {
  title: string;
  description: string;
  emptyMessage: string;
  performers: HoldingPerformance[];
};

export function PerformersCard({ title, description, emptyMessage, performers }: PerformersCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {performers.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        ) : (
          <ol className="divide-y">
            {performers.map((p) => (
              <li key={p.securityId} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <SecurityLabel securityId={p.securityId} name={p.name} ticker={p.ticker} type={p.type} />
                <div className="shrink-0 text-right tabular-nums">
                  <SignedValue value={p.pnlPercentage} className="block text-sm font-medium">
                    {formatPercentage(p.pnlPercentage)}
                  </SignedValue>
                  <SignedValue value={p.pnlAmount} className="block text-xs">
                    <Money value={p.pnlAmount} change />
                  </SignedValue>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
