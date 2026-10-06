import { Skeleton } from "@/components/ui/skeleton";

export default function SecurityLoading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading security">
      <div className="space-y-3 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="h-44" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-64" />
        </div>
        <div className="grid content-start gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}
