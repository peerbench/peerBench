import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function ModelLeaderboardSkeleton() {
  return (
    <Table className="rounded-none border-none shadow-none overflow-hidden">
      <TableHeader>
        <TableRow className="bg-gray-50 dark:bg-slate-700 hover:!bg-gray-50 dark:hover:!bg-slate-700">
          <TableHead className="w-[80px] font-semibold text-gray-700 dark:text-gray-300">
            Rank
          </TableHead>
          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
            Model
          </TableHead>
          <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">
            Avg. Score
          </TableHead>
          <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">
            Prompts Tested
          </TableHead>
          <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">
            Avg. Response Time
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow
            key={index}
            className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-6" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-32 font-mono" />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end">
                <Skeleton className="h-5 w-12" />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <Skeleton className="h-4 w-8" />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end">
                <Skeleton className="h-4 w-16" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
