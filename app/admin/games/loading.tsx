import { Skeleton } from "@/Components/ui/skeleton";

const Loading = () => (
  <>
    <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-44" />
      </div>
      <Skeleton className="h-9 w-28" />
    </div>

    <div className="overflow-hidden rounded-xl border">
      <Skeleton className="h-11 w-full rounded-none" />
      <div className="divide-y">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </>
);

export default Loading;
