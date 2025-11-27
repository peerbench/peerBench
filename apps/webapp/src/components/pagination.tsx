"use client";

import { cn } from "@/utils/cn";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useCallback, useMemo } from "react";

export type PaginationProps = {
  sizeOptions?: number[];
  currentPage: number;
  pageSize: number;
  totalItemCount: number;
  disabled?: boolean;
  onPageSizeChange?: (pageSize: number) => void;
  onPageChange?: (page: number, direction: "next" | "prev") => void;
};

export function Pagination({
  currentPage,
  pageSize,
  totalItemCount,
  disabled,
  onPageSizeChange,
  onPageChange,
  sizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const hasNextPage = useMemo(
    () => currentPage * pageSize < totalItemCount,
    [currentPage, pageSize, totalItemCount]
  );
  const hasPrevPage = useMemo(() => currentPage > 1, [currentPage]);
  const totalPages = useMemo(
    () => Math.ceil(totalItemCount / pageSize),
    [totalItemCount, pageSize]
  );
  const availablePages = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages]
  );

  const handlePageChange = useCallback(
    (page: string) => {
      const pageNumber = parseInt(page);
      if (pageNumber >= 1 && pageNumber <= totalPages) {
        onPageChange?.(pageNumber, pageNumber > currentPage ? "next" : "prev");
      }
    },
    [currentPage, onPageChange, totalPages]
  );

  const handlePageSizeChange = useCallback(
    (value: string) => {
      onPageSizeChange?.(Number(value));
    },
    [onPageSizeChange]
  );

  const handlePrevPage = useCallback(() => {
    if (hasPrevPage) {
      onPageChange?.(currentPage - 1, "prev");
    }
  }, [currentPage, hasPrevPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (hasNextPage) {
      onPageChange?.(currentPage + 1, "next");
    }
  }, [currentPage, hasNextPage, onPageChange]);

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg border shadow-sm flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6",
        disabled && "cursor-progress bg-gray-100 dark:bg-gray-700"
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Show
          </label>
          <Select
            value={pageSize.toString()}
            onValueChange={handlePageSizeChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            entries
          </span>
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing{" "}
          <span className="font-medium">
            {(currentPage - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-medium">
            {Math.min(currentPage * pageSize, totalItemCount)}
          </span>{" "}
          of <span className="font-medium">{totalItemCount}</span> results
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handlePrevPage}
          disabled={!hasPrevPage || disabled}
        >
          Previous
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">Page</span>
          <Select
            value={currentPage.toString()}
            onValueChange={handlePageChange}
            disabled={disabled}
          >
            <SelectTrigger className="">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availablePages.map((page) => (
                <SelectItem key={page} value={page.toString()}>
                  {page}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-700 dark:text-gray-300">of</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {totalPages}
          </span>
        </div>

        <Button
          variant="outline"
          onClick={handleNextPage}
          disabled={!hasNextPage || disabled}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
