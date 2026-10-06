"use client";

import { DollarSign, IndianRupee } from "lucide-react";

import { useCurrency } from "@/components/currency/currency-provider";
import { formatSnapshotDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";

const rateFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 });

const OPTIONS = [
  { currency: "USD", icon: DollarSign },
  { currency: "INR", icon: IndianRupee },
] as const;

export function CurrencyToggle() {
  const { currency, rate, setCurrency } = useCurrency();
  const isInr = currency === "INR";

  const title = rate
    ? `$1 = ₹${rateFormat.format(rate.rate)} · ${
        rate.source === "MANUAL" ? "your rate" : `market rate for ${formatSnapshotDate(rate.date!)}`
      }`
    : "Exchange rate unavailable, so amounts are shown in USD";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isInr}
      aria-label="Show amounts in Indian rupees"
      title={title}
      disabled={!rate}
      onClick={() => setCurrency(isInr ? "USD" : "INR")}
      className="bg-muted flex items-center rounded-full p-0.5 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
    >
      {OPTIONS.map(({ currency: option, icon: Icon }) => (
        <span
          key={option}
          aria-hidden="true"
          className={cn(
            "flex size-7 items-center justify-center rounded-full transition-all",
            currency === option ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          <Icon className="size-3.5" />
        </span>
      ))}
    </button>
  );
}
