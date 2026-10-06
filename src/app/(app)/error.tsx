"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Renders a plain message instead of the thrown error, so a stack trace or a
 * database detail never reaches the browser.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
      <div className="bg-muted mb-4 flex size-11 items-center justify-center rounded-full">
        <TriangleAlert className="text-warning size-5" />
      </div>
      <h2 className="text-base font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">
        This page could not be loaded. Nothing was changed.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground mt-3 font-mono text-xs">
          Reference: {error.digest}
        </p>
      ) : null}
      <Button onClick={reset} size="sm" variant="outline" className="mt-5">
        <RotateCcw className="size-4" />
        Try again
      </Button>
    </div>
  );
}
