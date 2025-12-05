"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth";
import { toast } from "react-toastify";

interface ComputeRankingsResponse {
  success: boolean;
  computationId?: number;
  trustRankingsComputed?: boolean;
  eloMatchesProcessed?: number;
  eloModelsUpdated?: number;
  eloNewModelsAdded?: number;
  elapsedMs?: number;
  error?: string;
}

/**
 * Check if user is authorized to compute rankings (forest-ai.org or admin@peerbench.ai)
 */
function isAuthorizedToCompute(email: string | undefined): boolean {
  if (!email) return false;
  return (
    email.includes("forest-ai.org") || email.includes("admin@peerbench.ai")
  );
}

export function ComputeRankingsButton() {
  const queryClient = useQueryClient();
  const user = useAuth();

  const isAuthorized = isAuthorizedToCompute(user?.email ?? undefined);

  const computeRankingsMutation = useMutation({
    mutationFn: async (): Promise<ComputeRankingsResponse> => {
      const response = await fetch("/api/v2/rankings/compute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to compute rankings");
      }
      return data;
    },
    onSuccess: (data) => {
      const messages: string[] = [];
      
      if (data.trustRankingsComputed) {
        messages.push("Trust rankings computed");
      }
      if (data.eloMatchesProcessed && data.eloMatchesProcessed > 0) {
        messages.push(`${data.eloMatchesProcessed} ELO matches processed`);
      }
      if (data.eloModelsUpdated && data.eloModelsUpdated > 0) {
        messages.push(`${data.eloModelsUpdated} models updated`);
      }
      
      const message = messages.length > 0 
        ? `Rankings computed! ${messages.join(", ")}.`
        : "Rankings computed successfully!";
      
      toast.success(message);
      
      // Invalidate all ranking queries
      queryClient.invalidateQueries({ queryKey: ["rankings"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to compute rankings: ${error.message}`);
    },
  });

  if (!isAuthorized) {
    return null;
  }

  return (
    <Button
      onClick={() => computeRankingsMutation.mutate()}
      disabled={computeRankingsMutation.isPending}
      variant="outline"
      className="flex items-center gap-2"
    >
      {computeRankingsMutation.isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Computing...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          Compute Rankings
        </>
      )}
    </Button>
  );
}

