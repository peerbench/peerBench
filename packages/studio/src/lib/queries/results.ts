import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useResults(params?: ResultListParams) {
  return useQuery({
    queryKey: queryKeys.results.list(params),
    queryFn: () => api.listAllResults(params),
  });
}

export function useResult(id: string, options?: UseResultOptions) {
  return useQuery({
    queryKey: queryKeys.results.detail(id),
    queryFn: () => api.getResult(id),
    enabled: options?.enabled ?? true,
  });
}

export function useResultFilterOptions() {
  return useQuery({
    queryKey: queryKeys.results.filterOptions(),
    queryFn: () => api.getResultFilterOptions(),
    staleTime: 1000 * 60 * 5, // 5 minutes - filter options change infrequently
  });
}

export function useRerunResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resultId: string) => api.rerunResult(resultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
    },
  });
}

interface UseResultOptions {
  enabled?: boolean;
}

interface ResultListParams {
  configId?: string;
  configName?: string;
  testCaseId?: string;
  resultId?: string;
  runId?: string;
  agentId?: string;
  status?: string;
  scoreMin?: number;
  scoreMax?: number;
  runner?: string;
  scorer?: string;
  limit?: number;
  offset?: number;
}
