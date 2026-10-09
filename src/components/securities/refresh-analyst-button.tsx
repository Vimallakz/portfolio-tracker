"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { refreshSecurityAnalystData } from "@/lib/market-data/actions";

export function RefreshAnalystButton({ securityId }: { securityId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="xs"
      variant="ghost"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await refreshSecurityAnalystData(securityId);
          if (result.ok) toast.success("Analyst data refreshed");
          else toast.error(result.error);
        })
      }
    >
      {isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      Refresh analysts
    </Button>
  );
}
