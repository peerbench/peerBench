import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useAgents(params?: AgentListParams) {
  return useQuery({
    queryKey: queryKeys.agents.list(params),
    queryFn: () => api.listAgents(params),
  });
}

export function useAgent(id: string, options?: UseAgentOptions) {
  return useQuery({
    queryKey: queryKeys.agents.detail(id),
    queryFn: () => api.getAgent(id),
    enabled: options?.enabled ?? true,
  });
}

export function useAgentOverview(agentId: string, options?: UseAgentOptions) {
  return useQuery({
    queryKey: queryKeys.agents.overview(agentId),
    queryFn: () => api.getAgentOverview(agentId),
    enabled: options?.enabled ?? true,
  });
}

export function useAgentPerformance(
  agentId: string,
  params?: AgentPerformanceParams,
  options?: UseAgentOptions
) {
  return useQuery({
    queryKey: queryKeys.agents.performance(agentId, params),
    queryFn: () => api.getAgentPerformance(agentId, params),
    enabled: options?.enabled ?? true,
  });
}

export function useAgentRunPerformance(
  agentId: string,
  params?: AgentPerformanceParams,
  options?: UseAgentOptions
) {
  return useQuery({
    queryKey: queryKeys.agents.runPerformance(agentId, params),
    queryFn: () => api.getAgentRunPerformance(agentId, params),
    enabled: options?.enabled ?? true,
  });
}

export function useAgentConfigPerformance(
  agentId: string,
  params?: AgentConfigPerformanceParams,
  options?: UseAgentOptions
) {
  return useQuery({
    queryKey: queryKeys.agents.configPerformance(agentId, params),
    queryFn: () => api.listAgentConfigPerformance(agentId, params),
    enabled: options?.enabled ?? true,
  });
}

export function useAgentTestCasePerformance(
  agentId: string,
  params?: AgentTestCasePerformanceParams,
  options?: UseAgentOptions
) {
  return useQuery({
    queryKey: queryKeys.agents.testCasePerformance(agentId, params),
    queryFn: () => api.listAgentConfigTestCasePerformance(agentId, params),
    enabled: options?.enabled ?? true,
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
    meta: {
      successMessage: "Agent deleted",
      errorMessage: "Failed to delete agent",
    },
  });
}

export function useImportAgents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (baseUrl: string) => api.importAgents(baseUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
    meta: {
      successMessage: "Agents imported",
      errorMessage: "Failed to import agents",
    },
  });
}

export function useAgentHealthCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => api.triggerAgentHealthCheck(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
    meta: {
      errorMessage: "Health check failed",
    },
  });
}

export function useAllHealthChecks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.triggerAllHealthChecks(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
    meta: {
      errorMessage: "Health checks failed",
    },
  });
}

interface UseAgentOptions {
  enabled?: boolean;
}

interface AgentListParams {
  search?: string;
  limit?: number;
  offset?: number;
}

interface AgentPerformanceParams {
  days?: number;
  configId?: string | null;
  configVersion?: number;
}

interface AgentConfigPerformanceParams {
  limit?: number;
  offset?: number;
}

interface AgentTestCasePerformanceParams {
  configId?: string | null;
  limit?: number;
  offset?: number;
}
