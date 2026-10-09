"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActiveNavItem, navigation } from "@/lib/config/navigation";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  onNavigate?: () => void;
};

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6" aria-label="Main">
      {navigation.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="text-muted-foreground px-3 pb-1 text-xs font-medium tracking-wide uppercase">
            {group.title}
          </p>
          {group.items.map((item) => {
            const isActive = isActiveNavItem(item.href, pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  "focus-visible:ring-sidebar-ring focus-visible:ring-2 focus-visible:outline-none",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground light:shadow-[inset_2px_0_0_var(--sidebar-primary)] font-medium"
                    : "text-muted-foreground light:hover:bg-muted light:hover:text-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.title}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
