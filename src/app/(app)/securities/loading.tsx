import { Skeleton } from "@/components/ui/skeleton";

export default function SecuritiesLoading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading securities">
      <div className="space-y-2 pb-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
