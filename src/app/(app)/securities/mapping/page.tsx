import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { SecurityDetailsForm } from "@/components/securities/security-details-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listUnmappedSecurities } from "@/lib/portfolio/securities/queries";
import { toSecurityDetailsFormValues } from "@/lib/portfolio/securities/schema";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "Add tickers | Portfolio Intelligence" };

export default async function SecurityMappingPage() {
  const { activeProfile } = await getProfileContext();
  const securities = activeProfile ? await listUnmappedSecurities(activeProfile.id) : [];

  return (
    <>
      <PageHeader
        title="Add tickers"
        description="Tickertape CSVs list names, not ticker symbols. Add a ticker once and every future import of that name uses it."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/securities">Back to securities</Link>
          </Button>
        }
      />

      {securities.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Every security has a ticker"
          description="New names from future imports will show up here until you add their ticker."
          action={{ label: "View securities", href: "/securities" }}
        />
      ) : (
        <div className="grid gap-4">
          <p className="text-muted-foreground text-sm">
            {securities.length} {securities.length === 1 ? "security needs" : "securities need"} a ticker, the symbol
            it trades under, like GRAB or VOO. Check the type too: it was guessed from the name, so an ETF without
            “ETF” in its name shows as a stock. Leave Tickertape ticker blank unless Tickertape uses a different symbol.
          </p>
          {securities.map((security) => (
            <Card key={security.id} size="sm">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <Link href={`/securities/${security.id}`} className="hover:underline">
                    {security.name}
                  </Link>
                  {security.isHeld ? null : <Badge variant="outline">No longer held</Badge>}
                </CardTitle>
                <CardDescription>Name as it appears in your Tickertape CSV.</CardDescription>
              </CardHeader>
              <CardContent>
                <SecurityDetailsForm
                  securityId={security.id}
                  defaultValues={toSecurityDetailsFormValues({ ...security, ticker: null })}
                  compact
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
