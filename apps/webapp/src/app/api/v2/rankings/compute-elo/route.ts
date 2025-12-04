import { createHandler } from "@/lib/route-kit";
import { forestAiAuth } from "@/lib/route-kit/middlewares/admin-auth";
import { EloService } from "@/services/elo.service";
import { NextResponse } from "next/server";

export const POST = createHandler()
  .use(forestAiAuth)
  .handle(async () => {
    const result = await EloService.computeElo();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error ?? "ELO computation failed",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      matchesProcessed: result.matchesProcessed,
      modelsUpdated: result.modelsUpdated,
      newModelsAdded: result.newModelsAdded,
      computationId: result.computationId,
      elapsedMs: result.elapsedMs,
    });
  });

export type ResponseType = {
  success: boolean;
  matchesProcessed?: number;
  modelsUpdated?: number;
  newModelsAdded?: number;
  computationId?: number;
  elapsedMs?: number;
  error?: string;
};

