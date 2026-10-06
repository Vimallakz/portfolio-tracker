import { ChevronRight, IndianRupee, Tags, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Settings | Portfolio Intelligence" };

const sections = [
  {
    title: "Account",
    description: "Your sign-in email and password.",
    href: "/settings/account",
    icon: UserRound,
  },
  {
    title: "Investment profiles",
    description: "Names, contact details and PAN for each investment profile.",
    href: "/settings/profile",
    icon: UsersRound,
  },
  {
    title: "Currency",
    description: "USD to INR rate used when showing amounts in rupees.",
    href: "/settings/currency",
    icon: IndianRupee,
  },
  {
    title: "Tags",
    description: "Custom tags used to classify securities.",
    href: "/settings/tags",
    icon: Tags,
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.href} className="p-0">
            <Link
              href={section.href}
              className="hover:bg-accent/50 flex items-start gap-3 rounded-lg p-4 transition-colors"
            >
              <section.icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{section.title}</p>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {section.description}
                </p>
              </div>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}
