import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useLeaderboard(params?: LeaderboardParams) {
  return useQuery({
    queryKey: queryKeys.leaderboard.list(params),
    queryFn: () => api.getLeaderboard(params),
  });
}

export function useLeaderboardFilters() {
  return useQuery({
    queryKey: queryKeys.leaderboard.filters(),
    queryFn: () => api.getLeaderboardFilters(),
    staleTime: 1000 * 60 * 5, // 5 minutes - filter options change infrequently
  });
}

export function useFilteredLeaderboard(params?: LeaderboardFilterParams) {
  return useQuery({
    queryKey: queryKeys.leaderboard.filtered(params),
    queryFn: () => api.getFilteredLeaderboard(params),
  });
}

interface LeaderboardParams {
  runner?: string;
  days?: number;
}

interface LeaderboardFilterParams {
  tags?: string[];
  tagMode?: "and" | "or";
  runner?: string;
  scorer?: string;
  days?: number;
  minutes?: number;
  configId?: string;
  provider?: string;
  agentId?: string;
  minResults?: number;
  compareAgents?: string[];
  groupByPromptVersion?: boolean;
}
