"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CollaboratorsTableRowProps } from "./row";
import React, { useState } from "react";

export interface CollaboratorsTableProps {
  /**
   * Maximum number of items to show without expanding.
   */
  maxItemsToShow?: number;
  children?:
    | React.ReactElement<CollaboratorsTableRowProps>
    | React.ReactElement<CollaboratorsTableRowProps>[];
}

export function CollaboratorsTable({
  maxItemsToShow = 5,
  children,
}: CollaboratorsTableProps) {
  const [showAll, setShowAll] = useState(false);
  const childrenArray = React.Children.toArray(children);

  if (childrenArray.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8">
        <div className="text-center text-slate-600 dark:text-slate-400">
          <p>No collaborators available.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto flex flex-col">
        {showAll ? children : childrenArray.slice(0, maxItemsToShow)}
      </div>
      {childrenArray.length > maxItemsToShow && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-center">
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
                Show all ({childrenArray.length - maxItemsToShow} more
                collaborators)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
