import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
  children?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
      {Icon ? (
        <div className="bg-muted mb-4 flex size-11 items-center justify-center rounded-full">
          <Icon className="text-muted-foreground size-5" />
        </div>
      ) : null}
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">
        {description}
      </p>
      {action ? (
        <Button asChild className="mt-5" size="sm">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
      {children}
    </div>
  );
}
