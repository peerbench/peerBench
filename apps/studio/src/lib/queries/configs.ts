import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useConfigs(params?: ConfigListParams) {
  return useQuery({
    queryKey: queryKeys.configs.list(params),
    queryFn: () => api.listConfigs(params),
  });
}

export function useConfig(id: string, options?: UseConfigOptions) {
  return useQuery({
    queryKey: queryKeys.configs.detail(id),
    queryFn: () => api.getConfig(id),
    enabled: options?.enabled ?? true,
  });
}

export function useConfigVersions(id: string, options?: UseConfigOptions) {
  return useQuery({
    queryKey: queryKeys.configs.versions(id),
    queryFn: () => api.getConfigVersions(id),
    enabled: options?.enabled ?? true,
  });
}

export function useConfigStats(
  configId: string,
  params?: ConfigStatsParams,
  options?: UseConfigOptions
) {
  return useQuery({
    queryKey: queryKeys.configs.stats(configId, params),
    queryFn: () => api.getConfigStats(configId, params),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConfigInput) => api.createConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.configs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    meta: {
      successMessage: "Configuration created",
      errorMessage: "Failed to create configuration",
    },
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: UpdateConfigInput) => api.updateConfig(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.configs.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.configs.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    meta: {
      successMessage: "Configuration updated",
      errorMessage: "Failed to update configuration",
    },
  });
}

export function useDeleteConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.configs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    meta: {
      successMessage: "Configuration deleted",
      errorMessage: "Failed to delete configuration",
    },
  });
}

export function useDuplicateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newName }: DuplicateConfigInput) =>
      api.duplicateConfig(id, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.configs.all });
    },
    meta: {
      successMessage: "Configuration duplicated",
      errorMessage: "Failed to duplicate configuration",
    },
  });
}

export function useToggleConfigFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleConfigFavorite(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.configs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.configs.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.quickTest.favorites(),
      });
    },
  });
}

interface UseConfigOptions {
  enabled?: boolean;
}

interface ConfigListParams {
  search?: string;
  tags?: string[];
  tagMode?: "and" | "or";
  orderBy?: string;
  favoritesOnly?: boolean;
  limit?: number;
  offset?: number;
}

interface ConfigStatsParams {
  days?: number;
}

interface CreateConfigInput {
  name: string;
  description?: string;
  configJson: Record<string, unknown>;
  tags?: string[];
}

interface UpdateConfigInput {
  id: string;
  data: {
    name?: string;
    description?: string;
    configJson?: Record<string, unknown>;
    tags?: string[];
  };
}

interface DuplicateConfigInput {
  id: string;
  newName: string;
}
