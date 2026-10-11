"use client";

import { useState } from "react";

import { useCurrency } from "@/components/currency/currency-provider";
import { Input } from "@/components/ui/input";
import { convertFromUsd, convertToUsd } from "@/lib/currency/currency";

const round2 = (value: number) => Math.round(value * 100) / 100;

export function parseNumber(draft: string): number | null {
  if (draft.trim() === "") return null;
  const value = Number(draft);
  return Number.isFinite(value) ? value : null;
}

/** An amount typed in the display currency and reported in USD. Re-renders its text when the currency changes. */
export function MoneyInput({
  id,
  usdValue,
  onChange,
  name,
}: {
  id: string;
  usdValue: number;
  onChange: (usd: number) => void;
  name?: string;
}) {
  const { currency, rate } = useCurrency();
  const toDraft = (usd: number) => String(round2(convertFromUsd(usd, currency, rate)));

  const [draft, setDraft] = useState(() => toDraft(usdValue));
  const [draftCurrency, setDraftCurrency] = useState(currency);

  if (draftCurrency !== currency) {
    setDraftCurrency(currency);
    setDraft(toDraft(usdValue));
  }

  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
        {currency === "INR" ? "₹" : "$"}
      </span>
      <Input
        id={id}
        name={name}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        className="pl-6 tabular-nums"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          const value = parseNumber(event.target.value);
          if (value !== null) onChange(convertToUsd(value, currency, rate));
        }}
      />
    </div>
  );
}
