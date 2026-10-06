"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { SecurityDetailsForm } from "@/components/securities/security-details-form";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SecurityDetail } from "@/lib/portfolio/securities/queries";
import { toSecurityDetailsFormValues } from "@/lib/portfolio/securities/schema";

function Fact({ label, value, missing = "Not set" }: { label: string; value: string | null; missing?: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={value ? "text-right" : "text-muted-foreground text-right"}>{value ?? missing}</dd>
    </div>
  );
}

export function SecurityDetailsCard({ security }: { security: SecurityDetail["security"] }) {
  const [editing, setEditing] = useState(security.ticker === null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security details</CardTitle>
        <CardDescription>
          {security.ticker === null
            ? "Add the ticker so future imports and Tickertape links use it."
            : "Shared facts about this security, used by every profile."}
        </CardDescription>
        {editing ? null : (
          <CardAction>
            <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil />
              Edit
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <SecurityDetailsForm
            securityId={security.id}
            defaultValues={toSecurityDetailsFormValues(security)}
            onSaved={() => setEditing(false)}
            onCancel={security.ticker === null ? undefined : () => setEditing(false)}
          />
        ) : (
          <dl className="divide-y text-sm">
            <Fact label="Ticker" value={security.ticker} />
            <Fact label="Type" value={security.type === "ETF" ? "ETF" : "Stock"} />
            <Fact label="Tickertape ticker" value={security.tickertapeTicker} missing="Same as ticker" />
            <Fact label="Sector" value={security.sector} />
            <Fact label="Industry" value={security.industry} />
            <Fact label="Name in CSV" value={security.sourceNames.join(", ") || null} />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
