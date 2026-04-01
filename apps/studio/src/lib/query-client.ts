import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { toastError, toastSuccess } from "./toast";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only show toast for queries that have explicitly opted in via meta.errorMessage
      // This prevents duplicate toasts when components handle errors themselves
      const errorMessage = query.meta?.errorMessage;
      if (typeof errorMessage === "string") {
        toastError(error, errorMessage);
      }
    },
  }),
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      const successMessage = mutation.meta?.successMessage;
      if (typeof successMessage === "string") {
        toastSuccess(successMessage);
      }
    },
    onError: (error, _variables, _context, mutation) => {
      const errorMessage = mutation.meta?.errorMessage;
      if (typeof errorMessage === "string") {
        toastError(error, errorMessage);
      }
    },
  }),
});
