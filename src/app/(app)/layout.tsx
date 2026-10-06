import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getProfileContext } from "@/lib/profiles/profile-context";

/**
 * Shell for every signed-in page. Resolving the profile context here means each
 * page below inherits the same scope instead of deriving it independently.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { profiles, activeProfile } = await getProfileContext();

  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader profiles={profiles} activeProfile={activeProfile} />
        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
