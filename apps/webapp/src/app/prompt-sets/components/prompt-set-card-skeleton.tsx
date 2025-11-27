import { Skeleton } from "@/components/ui/skeleton";

export function PromptSetCardSkeletonCard() {
  return (
    <div className="group overflow-hidden border-0 shadow-lg bg-card h-full flex flex-col rounded-lg">
      <div className="p-6 flex flex-col h-full">
        <div className="flex flex-col h-full">
          <div className="flex items-start gap-3 mb-4">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <Skeleton className="h-6 flex-1" />
          </div>

          <div className="mb-4 flex-grow space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
