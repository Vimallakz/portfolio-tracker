import { ChartCandlestick } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <ChartCandlestick className="size-5" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight">Portfolio Intelligence</span>
        </div>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
