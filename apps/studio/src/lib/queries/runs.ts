import {
  useQuery,
  useMutation,
  useQueryClient,
  type Query,
} from "@tanstack/react-query";
import { api, type Run } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useRuns(params?: RunListParams) {
  return useQuery({
    queryKey: queryKeys.runs.list(params),
    queryFn: () => api.listRuns(params),
  });
}

export function useRun(id: string, options?: UseRunOptions) {
  return useQuery({
    queryKey: queryKeys.runs.detail(id),
    queryFn: () => api.getRun(id),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}

export function useRunResults(
  runId: string,
  params?: RunResultsParams,
  options?: UseRunOptions
) {
  return useQuery({
    queryKey: queryKeys.runs.results(runId, params),
    queryFn: () => api.getRunResults(runId, params),
    enabled: options?.enabled ?? true,
  });
}

export function useRunFilterOptions() {
  return useQuery({
    queryKey: queryKeys.runs.filterOptions(),
    queryFn: () => api.getRunFilterOptions(),
    staleTime: 1000 * 60 * 5, // 5 minutes - filter options change infrequently
  });
}

export function useCreateRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRunInput) => api.createRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    meta: {
      errorMessage: "Failed to create run",
    },
  });
}

export function useExecuteConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExecuteConfigInput) => api.executeConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.configs.all });
    },
    meta: {
      errorMessage: "Failed to start benchmark",
    },
  });
}

export function useCancelRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.cancelRun(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.detail(id) });
    },
    meta: {
      successMessage: "Run cancelled",
      errorMessage: "Failed to cancel run",
    },
  });
}

interface UseRunOptions {
  enabled?: boolean;
  refetchInterval?:
    | number
    | false
    | ((query: Query<Run, Error>) => number | false | undefined);
}

interface RunListParams {
  configId?: string;
  configTag?: string;
  status?: string;
  runner?: string;
  scorer?: string;
  source?: string;
  agentId?: string;
  provider?: string;
  includePracticeRuns?: boolean;
  limit?: number;
  offset?: number;
}

interface RunResultsParams {
  limit?: number;
  offset?: number;
}

interface CreateRunInput {
  configId?: string;
  configSnapshot: Record<string, unknown>;
  totalTestCases?: number;
  metadata?: Record<string, unknown>;
}

interface ExecuteConfigInput {
  configId?: string;
  configSnapshot?: Record<string, unknown>;
}
