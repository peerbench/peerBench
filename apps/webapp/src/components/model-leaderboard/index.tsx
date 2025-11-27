"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ModelLeaderboardRowProps } from "./row";
import React, { useState } from "react";

export interface ModelLeaderboardProps {
  /**
   * Maximum number of items to show without expanding.
   */
  maxItemsToShow?: number;
  children?:
    | React.ReactElement<ModelLeaderboardRowProps>
    | React.ReactElement<ModelLeaderboardRowProps>[];
}

export function ModelLeaderboard({
  maxItemsToShow = 5,
  children,
}: ModelLeaderboardProps) {
  const [showAll, setShowAll] = useState(false);
  const childrenArray = React.Children.toArray(children);

  if (childrenArray.length === 0) {
    return (
      <div className="bg-white border-slate-200 flex itmes-center justify-center">
        <div className="p-6 text-center text-slate-600 dark:text-slate-400">
          <p>No leaderboard data available for this Benchmark yet.</p>
          <p className="text-sm mt-2">
            Model evaluations will appear here once tests are run.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Table className="rounded-none border-none shadow-none">
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
          {showAll ? children : childrenArray.slice(0, maxItemsToShow)}
        </TableBody>
      </Table>
      {childrenArray.length - maxItemsToShow > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show all ({childrenArray.length - maxItemsToShow} more models)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
