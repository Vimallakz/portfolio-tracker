import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading report">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-8 w-80" />
      <Skeleton className="mx-auto h-[900px] w-full max-w-[760px]" />
    </div>
  );
}
