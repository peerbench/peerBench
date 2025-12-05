import { createHandler } from "@/lib/route-kit";
import { forestAiAuth } from "@/lib/route-kit/middlewares/admin-auth";
import { RankingService } from "@/services/ranking.service";
import { NextResponse } from "next/server";

export const POST = createHandler()
  .use(forestAiAuth)
  .handle(async () => {
    const result = await RankingService.computeAllRankings();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error ?? "Ranking computation failed",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      computationId: result.computationId,
      trustRankingsComputed: result.trustRankingsComputed,
      eloMatchesProcessed: result.eloMatchesProcessed,
      eloModelsUpdated: result.eloModelsUpdated,
      eloNewModelsAdded: result.eloNewModelsAdded,
      elapsedMs: result.elapsedMs,
    });
  });

export type ResponseType = {
  success: boolean;
  computationId?: number;
  trustRankingsComputed?: boolean;
  eloMatchesProcessed?: number;
  eloModelsUpdated?: number;
  eloNewModelsAdded?: number;
  elapsedMs?: number;
  error?: string;
};

