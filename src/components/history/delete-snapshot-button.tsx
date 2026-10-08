"use client";

import { Check, Loader2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteSnapshot } from "@/lib/portfolio/snapshots/actions";

type DeleteSnapshotButtonProps = {
  snapshotId: string;
  /** Formatted date, used in the confirmation. */
  label: string;
  holdingCount: number;
  /** Icon only, for table rows. */
  compact?: boolean;
};

export function DeleteSnapshotButton({ snapshotId, label, holdingCount, compact = false }: DeleteSnapshotButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const holdings = `${holdingCount} ${holdingCount === 1 ? "holding" : "holdings"}`;

  function remove() {
    startTransition(async () => {
      const result = await deleteSnapshot(snapshotId);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setOpen(false);
      toast.success(`Snapshot from ${label} deleted`);
      router.replace("/history");
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        {compact ? (
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Delete snapshot from ${label}`}
            title="Delete snapshot"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
            <Trash2 />
            Delete snapshot
          </Button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <div className="flex items-start gap-4">
          <div className="bg-destructive/10 text-destructive flex size-11 shrink-0 items-center justify-center rounded-full">
            <Trash2 className="size-5" aria-hidden="true" />
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              The snapshot from <span className="text-foreground font-medium">{label}</span> will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <ul className="bg-muted/50 grid gap-2.5 rounded-xl border p-4 text-sm">
          <li className="flex items-start gap-2.5">
            <X className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium">Removed:</span> this snapshot and its {holdings}
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Check className="text-positive mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium">Kept:</span> your securities, research and tags
            </span>
          </li>
        </ul>

        <p className="text-muted-foreground text-xs">
          This cannot be undone. To bring it back, import the same CSV again.
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                remove();
              }}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {isPending ? "Deleting…" : "Delete snapshot"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
