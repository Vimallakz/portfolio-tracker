"use client";

import { useMoneyFormat } from "@/components/currency/currency-provider";

/**
 * A USD amount shown in the selected display currency. A client leaf, so server
 * components can render it and it still follows the header toggle.
 */
export function Money({ value, change = false }: { value: number | null | undefined; change?: boolean }) {
  const { money, moneyChange } = useMoneyFormat();

  return <>{change ? moneyChange(value) : money(value)}</>;
}
