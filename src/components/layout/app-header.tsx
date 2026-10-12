import { Settings } from "lucide-react";
import Link from "next/link";

import { CurrencyToggle } from "@/components/currency/currency-toggle";
import { AccountMenu } from "@/components/layout/account-menu";
import { AppLogo } from "@/components/layout/app-logo";
import { ProfileSelector } from "@/components/layout/profile-selector";
import { SecuritySearch } from "@/components/layout/security-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UploadReminder } from "@/components/layout/upload-reminder";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { UploadReminderWindow } from "@/lib/portfolio/reminders/upload-reminder";
import type { SearchableSecurity } from "@/lib/portfolio/securities/queries";
import type { ProfileSummary } from "@/lib/profiles/queries";

type AppHeaderProps = {
  user: CurrentUser;
  profiles: ProfileSummary[];
  activeProfile: ProfileSummary | null;
  uploadReminder: UploadReminderWindow | null;
  securities: SearchableSecurity[];
};

export function AppHeader({ user, profiles, activeProfile, uploadReminder, securities }: AppHeaderProps) {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-2 border-b px-4 pt-[env(safe-area-inset-top)] backdrop-blur print:hidden">
      <div className="lg:hidden">
        <AppLogo compact />
      </div>

      <div className="flex min-w-0 flex-1 justify-end sm:justify-center sm:px-4">
        <SecuritySearch securities={securities} />
      </div>

      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        {uploadReminder && <UploadReminder reminder={uploadReminder} />}
        <CurrencyToggle />
        <ProfileSelector profiles={profiles} activeProfile={activeProfile} />
        <ThemeToggle />
        <Button variant="ghost" size="icon" asChild aria-label="Settings" className="hidden lg:inline-flex">
          <Link href="/settings">
            <Settings className="size-4" />
          </Link>
        </Button>
        <AccountMenu email={user.email} name={user.name} />
      </div>
    </header>
  );
}
