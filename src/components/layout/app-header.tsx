import { Settings } from "lucide-react";
import Link from "next/link";

import { AppLogo } from "@/components/layout/app-logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ProfileSelector } from "@/components/layout/profile-selector";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import type { ProfileSummary } from "@/lib/profiles/queries";

type AppHeaderProps = {
  profiles: ProfileSummary[];
  activeProfile: ProfileSummary | null;
};

export function AppHeader({ profiles, activeProfile }: AppHeaderProps) {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
      <MobileNav />

      <div className="lg:hidden">
        <AppLogo />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ProfileSelector profiles={profiles} activeProfile={activeProfile} />
        <ThemeToggle />
        <Button variant="ghost" size="icon" asChild aria-label="Settings">
          <Link href="/settings">
            <Settings className="size-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
