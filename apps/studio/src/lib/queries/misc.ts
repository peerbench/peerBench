import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useBenchmarkMeta() {
  return useQuery({
    queryKey: queryKeys.benchmarkMeta.all,
    queryFn: () => api.getBenchmarkMeta(),
    staleTime: 1000 * 60 * 30, // 30 minutes - metadata changes very rarely
  });
}

export function useEnvVarNames() {
  return useQuery({
    queryKey: ["envVarNames"] as const,
    queryFn: () => api.getEnvVarNames(),
    staleTime: 1000 * 60 * 30, // 30 minutes - env var names change rarely
  });
}

export function useLocalConfigs() {
  return useQuery({
    queryKey: ["localConfigs"] as const,
    queryFn: () => api.scanLocalConfigs(),
  });
}

export function useLocalConfig(name: string, options?: UseLocalConfigOptions) {
  return useQuery({
    queryKey: ["localConfigs", "detail", name] as const,
    queryFn: () => api.getLocalConfig(name),
    enabled: options?.enabled ?? true,
  });
}

export function useQuickTestFavorites() {
  return useQuery({
    queryKey: queryKeys.quickTest.favorites(),
    queryFn: () => api.getQuickTestFavorites(),
  });
}

export function useQuickTestStatus(
  runIds: string[],
  options?: UseQuickTestStatusOptions
) {
  return useQuery({
    queryKey: queryKeys.quickTest.status(runIds),
    queryFn: () => api.getQuickTestStatus(runIds),
    enabled: options?.enabled ?? runIds.length > 0,
    refetchInterval: options?.refetchInterval,
  });
}

export function useComparisonData(
  params: ComparisonDataParams,
  options?: UseComparisonDataOptions
) {
  return useQuery({
    queryKey: ["comparison", params] as const,
    queryFn: () => api.getComparisonData(params),
    enabled: options?.enabled ?? true,
  });
}

export function useExecuteQuickTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExecuteQuickTestInput) => api.executeQuickTest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.quickTest.all });
    },
    meta: {
      errorMessage: "Failed to execute quick test",
    },
  });
}

export function useImportLocalConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, customName }: ImportLocalConfigInput) =>
      api.importLocalConfig(name, customName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.configs.all });
    },
    meta: {
      successMessage: "Configuration imported",
      errorMessage: "Failed to import configuration",
    },
  });
}

interface UseLocalConfigOptions {
  enabled?: boolean;
}

interface UseQuickTestStatusOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseComparisonDataOptions {
  enabled?: boolean;
}

interface ComparisonDataParams {
  agentIds: string[];
  configIds: string[];
  days?: number;
}

interface ExecuteQuickTestInput {
  configIds: string[];
  options?: {
    maxTestCasesPerConfig?: number;
    endpointBaseOverride?: string;
  };
}

interface ImportLocalConfigInput {
  name: string;
  customName?: string;
}
