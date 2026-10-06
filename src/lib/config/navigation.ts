import {
  BarChart3,
  Crosshair,
  FileSpreadsheet,
  GitCompareArrows,
  History,
  LayoutDashboard,
  Settings,
  Tags,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navigation: NavGroup[] = [
  {
    title: "Portfolio",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Securities", href: "/securities", icon: BarChart3 },
      { title: "History", href: "/history", icon: History },
      { title: "Compare", href: "/compare", icon: GitCompareArrows },
      { title: "Import CSV", href: "/import", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Research",
    items: [
      { title: "My Focus", href: "/focus", icon: Crosshair },
      { title: "Tags", href: "/settings/tags", icon: Tags },
    ],
  },
  {
    title: "Settings",
    items: [
      { title: "Account", href: "/settings/account", icon: UserRound },
      { title: "Investment profiles", href: "/settings/profile", icon: UsersRound },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const allHrefs = navigation.flatMap((group) =>
  group.items.map((item) => item.href),
);

/**
 * Exactly one item is ever active: the longest href that the path matches. So
 * /securities/GRAB highlights Securities, and /settings/profile highlights
 * Investment profiles without also lighting up Settings.
 */
export function isActiveNavItem(href: string, pathname: string): boolean {
  const bestMatch = allHrefs
    .filter(
      (candidate) =>
        pathname === candidate || pathname.startsWith(`${candidate}/`),
    )
    .sort((a, b) => b.length - a.length)[0];

  return bestMatch === href;
}
