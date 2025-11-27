import { Skeleton } from "@/components/ui/skeleton";

export function CollaboratorsTableSkeleton() {
  return (
    <div>
      <div className="overflow-x-auto flex flex-col">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="pl-6 text-lg text-slate-600 dark:text-slate-400 break-all border-b [&:last-child]:border-b-0"
          >
            <div className="py-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Skeleton className="h-7 w-32" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  );
}
