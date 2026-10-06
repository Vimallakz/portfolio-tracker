import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeRedirectPath } from "@/lib/auth/schema";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "Log in | Portfolio Intelligence" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = safeRedirectPath(next);

  if (await getSessionUser()) {
    redirect(nextPath);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Log in</CardTitle>
        <CardDescription>Welcome back. Enter your email and password.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <LoginForm next={nextPath} />
        <p className="text-muted-foreground text-center text-sm">
          New here?{" "}
          <Link href="/signup" className="text-foreground font-medium underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
