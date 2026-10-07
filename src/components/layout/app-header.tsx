import { Settings } from "lucide-react";
import Link from "next/link";

import { CurrencyToggle } from "@/components/currency/currency-toggle";
import { AccountMenu } from "@/components/layout/account-menu";
import { AppLogo } from "@/components/layout/app-logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ProfileSelector } from "@/components/layout/profile-selector";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UploadReminder } from "@/components/layout/upload-reminder";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { UploadReminderWindow } from "@/lib/portfolio/reminders/upload-reminder";
import type { ProfileSummary } from "@/lib/profiles/queries";

type AppHeaderProps = {
  user: CurrentUser;
  profiles: ProfileSummary[];
  activeProfile: ProfileSummary | null;
  uploadReminder: UploadReminderWindow | null;
};

export function AppHeader({ user, profiles, activeProfile, uploadReminder }: AppHeaderProps) {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
      <MobileNav />

      <div className="lg:hidden">
        <AppLogo />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {uploadReminder && <UploadReminder reminder={uploadReminder} />}
        <CurrencyToggle />
        <ProfileSelector profiles={profiles} activeProfile={activeProfile} />
        <ThemeToggle />
        <Button variant="ghost" size="icon" asChild aria-label="Settings">
          <Link href="/settings">
            <Settings className="size-4" />
          </Link>
        </Button>
        <AccountMenu email={user.email} name={user.name} />
      </div>
    </header>
  );
}
