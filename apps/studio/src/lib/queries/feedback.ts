import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useFeedbackList(params?: FeedbackListParams) {
  return useQuery({
    queryKey: queryKeys.feedback.list(params),
    queryFn: () => api.listFeedback(params ?? {}),
  });
}

export function useFeedbackStats(params?: FeedbackStatsParams) {
  return useQuery({
    queryKey: queryKeys.feedback.stats(params),
    queryFn: () => api.getFeedbackStats(params),
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeedbackInput) => api.createFeedback(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.feedback.forResult(variables.resultId),
      });
    },
    meta: {
      successMessage: "Feedback submitted",
      errorMessage: "Failed to submit feedback",
    },
  });
}

interface FeedbackListParams {
  configId?: string;
  sentiment?: "positive" | "negative";
  days?: number;
  limit?: number;
  offset?: number;
}

interface FeedbackStatsParams {
  days?: number;
}

interface CreateFeedbackInput {
  resultId: string;
  sentiment: "positive" | "negative";
  comment?: string;
  name?: string;
}
