import { useQuery } from "@tanstack/react-query";
import { useModelAPI } from "../hooks/use-model-api";

export function useModelList(provider: string) {
  const modelAPI = useModelAPI();

  return useQuery({
    queryKey: ["models", provider],
    queryFn: () => modelAPI.getProviderModels(provider),
  });
}
