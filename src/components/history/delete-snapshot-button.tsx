"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteSnapshot } from "@/lib/portfolio/snapshots/actions";

type DeleteSnapshotButtonProps = {
  snapshotId: string;
  /** Formatted date, used in the confirmation. */
  label: string;
  holdingCount: number;
};

export function DeleteSnapshotButton({ snapshotId, label, holdingCount }: DeleteSnapshotButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function remove() {
    const confirmed = window.confirm(
      `Delete the snapshot from ${label} and its ${holdingCount} ${holdingCount === 1 ? "holding" : "holdings"}?\n\n` +
        "Your securities, research and tags are kept. This cannot be undone, but you can import the same CSV again.",
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteSnapshot(snapshotId);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(`Snapshot from ${label} deleted`);
      router.replace("/history");
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={remove} disabled={isPending} className="text-destructive hover:text-destructive">
      <Trash2 />
      {isPending ? "Deleting…" : "Delete snapshot"}
    </Button>
  );
}
