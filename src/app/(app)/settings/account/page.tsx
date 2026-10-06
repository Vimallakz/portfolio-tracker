import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata = { title: "Account | Portfolio Intelligence" };

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();

  return (
    <>
      <Link href="/settings" className="text-muted-foreground hover:text-foreground mb-3 inline-flex w-fit items-center gap-1 text-sm">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Settings
      </Link>
      <PageHeader title="Account" description={`Signed in as ${user.email}.`} />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Enter your current password, then the new one. Other browsers signed in to this account will be signed out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </>
  );
}
