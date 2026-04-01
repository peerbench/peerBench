import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

// Standard Triggers

export function useTriggers(
  params?: TriggerListParams,
  options?: UseTriggersOptions
) {
  return useQuery({
    queryKey: queryKeys.triggers.list(params),
    queryFn: () => api.listTriggers(params),
    refetchInterval: options?.refetchInterval,
  });
}

export function useTrigger(id: string, options?: UseTriggerOptions) {
  return useQuery({
    queryKey: queryKeys.triggers.detail(id),
    queryFn: () => api.getTrigger(id),
    enabled: options?.enabled ?? true,
  });
}

export function useTriggerConfigs() {
  return useQuery({
    queryKey: queryKeys.triggers.configOptions(),
    queryFn: () => api.getTriggerConfigs(),
    staleTime: 1000 * 60 * 5, // 5 minutes - config options change infrequently
  });
}

// Langfuse Triggers

export function useLangfuseTriggers(
  params?: LangfuseTriggerListParams,
  options?: UseLangfuseTriggersOptions
) {
  return useQuery({
    queryKey: queryKeys.langfuseTriggers.list(params),
    queryFn: () => api.listLangfuseTriggers(params),
    refetchInterval: options?.refetchInterval,
  });
}

export function useLangfuseTrigger(id: string, options?: UseTriggerOptions) {
  return useQuery({
    queryKey: queryKeys.langfuseTriggers.detail(id),
    queryFn: () => api.getLangfuseTrigger(id),
    enabled: options?.enabled ?? true,
  });
}

export function useLangfuseStatus() {
  return useQuery({
    queryKey: queryKeys.langfuseTriggers.status(),
    queryFn: () => api.getLangfuseStatus(),
    staleTime: 1000 * 60 * 5, // 5 minutes - status changes infrequently
  });
}

export function useLangfusePrompts() {
  return useQuery({
    queryKey: queryKeys.langfuseTriggers.prompts(),
    queryFn: () => api.getLangfusePrompts(),
  });
}

export function useLangfuseTriggerConfigs() {
  return useQuery({
    queryKey: queryKeys.langfuseTriggers.configOptions(),
    queryFn: () => api.getLangfuseTriggerConfigs(),
    staleTime: 1000 * 60 * 5, // 5 minutes - config options change infrequently
  });
}

// Standard Trigger Mutations

export function useCreateTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTriggerInput) => api.createTrigger(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.triggers.all });
    },
    meta: {
      successMessage: "Trigger created",
      errorMessage: "Failed to create trigger",
    },
  });
}

export function useUpdateTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: UpdateTriggerInput) =>
      api.updateTrigger(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.triggers.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.triggers.detail(variables.id),
      });
    },
    meta: {
      successMessage: "Trigger updated",
      errorMessage: "Failed to update trigger",
    },
  });
}

export function useDeleteTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTrigger(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.triggers.all });
    },
    meta: {
      successMessage: "Trigger deleted",
      errorMessage: "Failed to delete trigger",
    },
  });
}

export function useFireTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.fireTrigger(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.triggers.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.triggers.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
    },
    meta: {
      successMessage: "Trigger fired",
      errorMessage: "Failed to fire trigger",
    },
  });
}

interface UseTriggerOptions {
  enabled?: boolean;
}

interface UseTriggersOptions {
  refetchInterval?: number | false;
}

interface UseLangfuseTriggersOptions {
  refetchInterval?: number | false;
}

interface TriggerListParams {
  search?: string;
  limit?: number;
  offset?: number;
}

interface LangfuseTriggerListParams {
  search?: string;
  limit?: number;
  offset?: number;
}

interface CreateTriggerInput {
  name: string;
  configId: string;
  intervalSeconds: number;
  enabled?: boolean;
  skipIfRecentRunSeconds?: number | null;
}

interface UpdateTriggerInput {
  id: string;
  data: {
    name?: string;
    configId?: string;
    intervalSeconds?: number;
    enabled?: boolean;
    skipIfRecentRunSeconds?: number | null;
  };
}

// Langfuse Trigger Mutations

export function useCreateLangfuseTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLangfuseTriggerInput) =>
      api.createLangfuseTrigger(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.langfuseTriggers.all,
      });
    },
    meta: {
      successMessage: "Langfuse trigger created",
      errorMessage: "Failed to create Langfuse trigger",
    },
  });
}

export function useUpdateLangfuseTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: UpdateLangfuseTriggerInput) =>
      api.updateLangfuseTrigger(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.langfuseTriggers.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.langfuseTriggers.detail(variables.id),
      });
    },
    meta: {
      successMessage: "Langfuse trigger updated",
      errorMessage: "Failed to update Langfuse trigger",
    },
  });
}

export function useDeleteLangfuseTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteLangfuseTrigger(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.langfuseTriggers.all,
      });
    },
    meta: {
      successMessage: "Langfuse trigger deleted",
      errorMessage: "Failed to delete Langfuse trigger",
    },
  });
}

export function useSyncLangfuse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.syncLangfuse(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.langfuseTriggers.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
    },
    meta: {
      successMessage: "Langfuse sync complete",
      errorMessage: "Failed to sync with Langfuse",
    },
  });
}

interface CreateLangfuseTriggerInput {
  name: string;
  promptName: string;
  configId: string;
  debounceSeconds?: number;
  enabled?: boolean;
}

interface UpdateLangfuseTriggerInput {
  id: string;
  data: {
    name?: string;
    promptName?: string;
    configId?: string;
    debounceSeconds?: number;
    enabled?: boolean;
  };
}
