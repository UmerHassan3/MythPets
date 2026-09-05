import { Skeleton } from "@/Components/ui/skeleton";

const Loading = () => (
  <>
    <div className="space-y-4 border-b pb-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64" />
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-[152px] w-full rounded-xl" />
      ))}
    </div>
  </>
);

export default Loading;
