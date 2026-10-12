"use client";

import { Calculator, Crosshair, History, LayoutDashboard, Menu, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { NavSheet } from "@/components/layout/mobile-nav";
import { isActiveNavItem } from "@/lib/config/navigation";
import { cn } from "@/lib/utils";

const TABS: { title: string; href: string; icon: LucideIcon }[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Planner", href: "/planner", icon: Calculator },
  { title: "Focus", href: "/focus", icon: Crosshair },
  { title: "History", href: "/history", icon: History },
];

const tabClass = (active: boolean) =>
  cn(
    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
  );

/** App-style tab bar on phones and tablets; the sidebar takes over from lg. */
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const onTab = TABS.some((tab) => isActiveNavItem(tab.href, pathname));

  return (
    <>
      <nav
        aria-label="Primary"
        data-bottom-nav
        className="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed inset-x-0 bottom-0 z-40 flex border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden"
      >
        {TABS.map((tab) => {
          const active = isActiveNavItem(tab.href, pathname);
          return (
            <Link key={tab.href} href={tab.href} className={tabClass(active)} aria-current={active ? "page" : undefined}>
              <tab.icon className="size-5" />
              {tab.title}
            </Link>
          );
        })}
        <button type="button" className={tabClass(!onTab || moreOpen)} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
          <Menu className="size-5" />
          More
        </button>
      </nav>
      <NavSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
