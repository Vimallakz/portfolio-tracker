import { cookies } from "next/headers";

import { CurrencyProvider } from "@/components/currency/currency-provider";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DISPLAY_CURRENCY_COOKIE, parseDisplayCurrency } from "@/lib/currency/currency";
import { getUsdInrRate } from "@/lib/currency/rate";
import { getUploadReminder } from "@/lib/portfolio/reminders/queries";
import { getProfileContext } from "@/lib/profiles/profile-context";

/**
 * Shell for every signed-in page. Resolving the profile context here means each
 * page below inherits the same scope instead of deriving it independently.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [user, { profiles, activeProfile }, cookieStore] = await Promise.all([
    getCurrentUser(),
    getProfileContext(),
    cookies(),
  ]);
  const [rate, uploadReminder] = await Promise.all([
    getUsdInrRate(user.id),
    activeProfile ? getUploadReminder(activeProfile.id) : null,
  ]);

  return (
    <CurrencyProvider initialCurrency={parseDisplayCurrency(cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value)} rate={rate}>
      <div className="flex min-h-full flex-1">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader user={user} profiles={profiles} activeProfile={activeProfile} uploadReminder={uploadReminder} />
          <main className="flex-1 px-4 py-6 lg:px-8 print:p-0">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </CurrencyProvider>
  );
}
