import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex items-start justify-between gap-3 pb-2">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-44" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-2" />
        <div className="grid gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-52" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
