"use client";

import { AppLogo } from "@/components/layout/app-logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type NavSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** The full navigation in a drawer, opened from the bottom bar's More tab. */
export function NavSheet({ open, onOpenChange }: NavSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0 pt-[env(safe-area-inset-top)]">
        <SheetHeader className="h-14 justify-center border-b px-5">
          <SheetTitle asChild>
            <div>
              <AppLogo />
            </div>
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <SidebarNav onNavigate={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
