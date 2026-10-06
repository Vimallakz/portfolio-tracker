import { ChartCandlestick } from "lucide-react";
import Link from "next/link";

export function AppLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <ChartCandlestick className="size-5" />
      <span className="text-sm font-semibold tracking-tight">
        Portfolio Intelligence
      </span>
    </Link>
  );
}
