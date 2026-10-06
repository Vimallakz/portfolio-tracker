import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-muted-foreground font-mono text-sm">404</p>
      <h1 className="mt-2 text-lg font-semibold">Page not found</h1>
      <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">
        That page does not exist.
      </p>
      <Button asChild size="sm" className="mt-5">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
