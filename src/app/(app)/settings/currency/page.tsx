import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { RateOverrideForm } from "@/components/currency/rate-override-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { fetchMarketRate, getRateOverride } from "@/lib/currency/rate";
import { formatSnapshotDate } from "@/lib/format/date";

export const metadata = { title: "Currency | Portfolio Intelligence" };

const rateFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 });

export default async function CurrencySettingsPage() {
  const user = await getCurrentUser();
  const [market, override] = await Promise.all([fetchMarketRate(), getRateOverride(user.id)]);

  return (
    <>
      <Link href="/settings" className="text-muted-foreground hover:text-foreground mb-3 inline-flex w-fit items-center gap-1 text-sm">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Settings
      </Link>
      <PageHeader
        title="Currency"
        description="Portfolio values are stored in US dollars, as Tickertape reports them. Switch to rupees with the $ / ₹ toggle in the header; every amount is converted at one rate."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Market rate</CardTitle>
            <CardDescription>
              European Central Bank reference rate, published each working day and refreshed every few hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {market ? (
              <>
                <p className="text-2xl font-semibold tabular-nums">$1 = ₹{rateFormat.format(market.rate)}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  As of {formatSnapshotDate(market.date!)}
                  {override === null ? " · in use" : " · not in use, your rate overrides it"}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                The rate service could not be reached. Amounts stay in USD unless you set your own rate.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your rate</CardTitle>
            <CardDescription>
              {override === null
                ? "Not set. The market rate is used."
                : `₹${rateFormat.format(override)} per $1 is used everywhere instead of the market rate.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RateOverrideForm key={override ?? "market"} override={override} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
