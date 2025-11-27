"use client";

import { useState, useMemo } from "react";
import { PromptSetCard } from "./components/prompt-set-card";
import LoadingSpinner from "@/components/loading-spinner";
import PromptSetCardSkeletonCard from "./components/prompt-set-card-skeleton";
import { errorMessage } from "@/utils/error-message";
import { useInfinitePromptSets } from "@/lib/react-query/use-infinite-prompt-sets";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import ControlsPanel from "./components/controls-panel";
import type { Filters } from "./types";

export default function PromptSetsPage() {
  const {
    data: promptSets,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    loadingRef,
  } = useInfinitePromptSets();

  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    sortBy: "",
    avgMin: "",
    avgMax: "",
    promptsMin: "",
    promptsMax: "",
  });

  const resetFilters = () =>
    setFilters({
      sortBy: "",
      avgMin: "",
      avgMax: "",
      promptsMin: "",
      promptsMax: "",
    });

  const applyFilters = () => setFiltersOpen(false);

  const processedList = useMemo(() => {
    if (!promptSets) return [];

    let list = [...promptSets];

    // search
    const q = search.toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const title = p.title?.toLowerCase() || "";
        const desc = p.description?.toLowerCase() || "";
        const tags = (p.tags?.join(" ") ?? "").toLowerCase();
        return title.includes(q) || desc.includes(q) || tags.includes(q);
      });
    }

    // RANGE FILTERS
    const avgMin = filters.avgMin !== "" ? Number(filters.avgMin) : null;
    const avgMax = filters.avgMax !== "" ? Number(filters.avgMax) : null;
    const promptsMin =
      filters.promptsMin !== "" ? Number(filters.promptsMin) : null;
    const promptsMax =
      filters.promptsMax !== "" ? Number(filters.promptsMax) : null;

    list = list.filter((p) => {
      if (avgMin !== null && !isNaN(avgMin) && p.averageScore < avgMin)
        return false;
      if (avgMax !== null && !isNaN(avgMax) && p.averageScore > avgMax)
        return false;
      if (
        promptsMin !== null &&
        !isNaN(promptsMin) &&
        p.totalPromptsCount < promptsMin
      )
        return false;
      if (
        promptsMax !== null &&
        !isNaN(promptsMax) &&
        p.totalPromptsCount > promptsMax
      )
        return false;
      return true;
    });

    // SORTING
    if (filters.sortBy) {
      const [field, order] = filters.sortBy.split("-");

      if (
        (field !== "createdAt" && field !== "updatedAt") ||
        (order !== "asc" && order !== "desc")
      ) {
        console.warn("Invalid sortBy format:", filters.sortBy);
      } else {
        list.sort((a, b) => {
          const aDate = field === "createdAt" ? a.createdAt : a.updatedAt;
          const bDate = field === "createdAt" ? b.createdAt : b.updatedAt;

          const x = new Date(aDate).getTime();
          const y = new Date(bDate).getTime();

          return order === "asc" ? x - y : y - x;
        });
      }
    }

    return list;
  }, [promptSets, search, filters]);

  /* ---------------------------------------------------
     ERROR VIEW
  ----------------------------------------------------- */
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Benchmarks</h1>
        <p className="text-sm text-gray-500 mb-8">
          Browse and explore available benchmarks.
        </p>

        <div className="flex flex-col items-center justify-center py-12 text-red-500">
          <p className="text-lg font-medium">Error loading Benchmarks</p>
          <p className="text-sm text-gray-600 mt-2">
            {errorMessage(error) || "Something went wrong."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------
     MAIN UI
  ----------------------------------------------------- */
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold">Benchmarks</h1>

        <button
          onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-400 rounded-lg hover:bg-gray-100"
        >
          <SlidersHorizontal size={18} />
          Filters
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Browse and explore available Benchmarks for testing and reviewing.
      </p>

      {/* SEARCH BAR */}
      <div className="relative mb-6">
        <SearchIcon
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Search by benchmark, description, tags..."
          className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg focus:border-blue-300 focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <PromptSetCardSkeletonCard key={`skeleton-${i}`} />
          ))
        ) : (
          <>
            {!isLoading &&
              !isFetchingNextPage &&
              processedList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <p className="text-lg">No matching benchmarks found</p>
                </div>
              )}

            {processedList.map((promptSet) => (
              <PromptSetCard key={promptSet.id} item={promptSet} />
            ))}

            <div ref={loadingRef} className="flex justify-center py-4">
              {isFetchingNextPage && <LoadingSpinner position="block" />}
              {processedList.length > 0 &&
                !hasNextPage &&
                promptSets?.length > 0 && (
                  <p className="text-gray-500 text-sm">
                    No more benchmarks to load
                  </p>
                )}
            </div>
          </>
        )}
      </div>

      {/* FILTER PANEL */}
      <ControlsPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        setFilters={setFilters}
        onApply={applyFilters}
        onReset={resetFilters}
      />
    </div>
  );
}
