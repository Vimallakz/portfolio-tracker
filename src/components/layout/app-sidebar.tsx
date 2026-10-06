import { SidebarNav } from "@/components/layout/sidebar-nav";
import { AppLogo } from "@/components/layout/app-logo";

/** Desktop sidebar. The mobile equivalent is MobileNav's drawer. */
export function AppSidebar() {
  return (
    <aside className="bg-sidebar hidden w-60 shrink-0 border-r lg:flex lg:flex-col">
      <div className="flex h-14 items-center border-b px-5">
        <AppLogo />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav />
      </div>
    </aside>
  );
}
