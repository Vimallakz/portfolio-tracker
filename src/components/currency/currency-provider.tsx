"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { setDisplayCurrency } from "@/lib/currency/actions";
import { convertFromUsd, type DisplayCurrency, type UsdInrRate } from "@/lib/currency/currency";
import { formatCompactMoney, formatMoney, formatMoneyChange } from "@/lib/format/number";

type CurrencyContextValue = {
  /** What amounts are shown in. Always USD when no rate is available. */
  currency: DisplayCurrency;
  rate: UsdInrRate | null;
  setCurrency: (currency: DisplayCurrency) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  initialCurrency,
  rate,
  children,
}: {
  initialCurrency: DisplayCurrency;
  rate: UsdInrRate | null;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState(initialCurrency);

  const setCurrency = useCallback((next: DisplayCurrency) => {
    setSelected(next);
    void setDisplayCurrency(next).then((result) => {
      if (!result.ok) toast.error(result.error);
    });
  }, []);

  const value = useMemo(
    () => ({ currency: rate ? selected : ("USD" as const), rate, setCurrency }),
    [selected, rate, setCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used inside CurrencyProvider.");
  }

  return context;
}

/** Formatters that take USD amounts and render them in the selected currency. */
export function useMoneyFormat() {
  const { currency, rate } = useCurrency();

  return useMemo(() => {
    const convert = (value: number | null | undefined) =>
      typeof value === "number" ? convertFromUsd(value, currency, rate) : value;

    return {
      currency,
      money: (value: number | null | undefined) => formatMoney(convert(value), currency),
      moneyChange: (value: number | null | undefined) => formatMoneyChange(convert(value), currency),
      compactMoney: (value: number | null | undefined) => formatCompactMoney(convert(value), currency),
    };
  }, [currency, rate]);
}
