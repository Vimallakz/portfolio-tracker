import { Skeleton } from "@/components/ui/skeleton";

export default function FocusLoading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading focus">
      <div className="space-y-2 pb-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-64" />
      <Skeleton className="h-40" />
    </div>
  );
}
