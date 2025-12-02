"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy, Bot, Activity, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ExperimentalNotice } from "../components/experimental-notice";

interface ModelRanking {
  model: string;
  score: number;
  promptsTestedCount: number;
  computedAt: string;
}

export default function ModelsLeaderboardPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const offset = (page - 1) * limit;

  const { data, isLoading, error } = useQuery({
    queryKey: ["rankings", "models", page, limit, offset],
    queryFn: async () => {
      const response = await fetch(`/api/rankings/models-performance?limit=${limit}&offset=${offset}`);
      if (!response.ok) throw new Error("Failed to fetch model rankings");
      return response.json();
    },
  });

  const hasNextPage = data?.pagination?.hasMore ?? false;
  const hasPrevPage = page > 1;
  const totalCount = data?.pagination?.total ?? 0;

  return (
    <main className="flex flex-col items-center justify-center mx-auto px-4 py-8 max-w-7xl">
      <div className="w-full mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="h-8 w-8 text-black dark:text-white" />
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Model Performance Leaderboard
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Rankings based on performance on quality-reviewed prompts
        </p>
        {data?.data?.[0]?.computedAt && (
          <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Last updated: {new Date(data.data[0].computedAt).toLocaleString()}
          </p>
        )}
      </div>

      <ExperimentalNotice />

      {error && (
        <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Failed to load rankings. Please try again later.
        </div>
      )}

      {isLoading ? (
        <div className="w-full space-y-4">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : (
        <div className="w-full space-y-3">
          {data?.data?.map((model: ModelRanking, index: number) => {
            const rank = offset + index + 1;
            return (
              <Card
                key={model.model}
                className="p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full font-bold text-lg ${
                      rank === 1
                        ? "bg-yellow-100 text-yellow-700"
                        : rank === 2
                          ? "bg-gray-100 text-gray-700"
                          : rank === 3
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    {rank <= 3 ? <Trophy className="h-6 w-6" /> : rank}
                  </div>

                {/* Model Name */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate">
                    {model.model}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Activity className="h-4 w-4" />
                      {model.promptsTestedCount} prompts tested
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {(model.score * 10000).toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">points</div>
                </div>
              </div>
            </Card>
            );
          })}

          {data?.data?.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No model rankings available yet.
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && data?.data && data.data.length > 0 && (
        <div className="w-full flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={!hasPrevPage}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="text-sm text-gray-600 text-center">
            <div>Page {page}</div>
            {totalCount > 0 && (
              <div className="text-xs text-gray-500">
                Showing {offset + 1}-{offset + data.data.length} of {totalCount}
              </div>
            )}
          </div>
          
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={!hasNextPage}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </main>
  );
}

