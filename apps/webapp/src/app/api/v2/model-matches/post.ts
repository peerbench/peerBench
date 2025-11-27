import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { modelMatchesTable, providerModelsTable } from "@/database/schema";
import { eq } from "drizzle-orm";

const bodySchema = z.object({
  modelASlug: z.string(), // Model slug (modelId)
  modelBSlug: z.string(), // Model slug (modelId)
  winnerSlug: z.string().nullable().optional(), // Model slug of winner (null means draw)
  promptId: z.string().uuid(),
  modelAScore: z.number().min(0).max(1), // 0-1 score for ELO calculation
  modelBScore: z.number().min(0).max(1),
  modelAResponseId: z.string().uuid().optional(),
  modelBResponseId: z.string().uuid().optional(),
});

// Standard ELO calculation with K=32
function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  scoreB: number
): { newRatingA: number; newRatingB: number } {
  const K = 32;

  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  const newRatingA = ratingA + K * (scoreA - expectedA);
  const newRatingB = ratingB + K * (scoreB - expectedB);

  return {
    newRatingA: Math.round(newRatingA),
    newRatingB: Math.round(newRatingB),
  };
}

export const POST = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    const matchId = await db.transaction(async (tx) => {
      // Insert the models if they don't exist
      await tx
        .insert(providerModelsTable)
        .values({
          // TODO: Currently we only support OpenRouter provider.
          provider: "openrouter.ai",
          host: "auto",
          owner: "unknown",
          name: "unknown",
          modelId: ctx.body.modelASlug,
          elo: 1000,
        })
        .onConflictDoNothing();
      await tx
        .insert(providerModelsTable)
        .values({
          // TODO: Currently we only support OpenRouter provider.
          provider: "openrouter.ai",
          host: "auto",
          owner: "unknown",
          name: "unknown",
          modelId: ctx.body.modelBSlug,
          elo: 1000,
        })
        .onConflictDoNothing();

      // Build where conditions for model lookups
      const modelAWhere = eq(providerModelsTable.modelId, ctx.body.modelASlug);

      const modelBWhere = eq(providerModelsTable.modelId, ctx.body.modelBSlug);

      // Get current ELO ratings with row-level locks to prevent concurrent updates
      // The FOR UPDATE lock ensures only one transaction can update these models at a time
      const [modelA, modelB] = await Promise.all([
        tx
          .select({ id: providerModelsTable.id, elo: providerModelsTable.elo })
          .from(providerModelsTable)
          .where(modelAWhere)
          .for("update") // Lock this row
          .limit(1),
        tx
          .select({ id: providerModelsTable.id, elo: providerModelsTable.elo })
          .from(providerModelsTable)
          .where(modelBWhere)
          .for("update") // Lock this row
          .limit(1),
      ]);

      if (!modelA[0] || !modelB[0]) {
        throw new Error("One or both models not found");
      }

      const modelAId = modelA[0].id;
      const modelBId = modelB[0].id;

      const currentEloA = modelA[0].elo ?? 1000;
      const currentEloB = modelB[0].elo ?? 1000;

      // Calculate new ELO ratings based on scores
      const { newRatingA, newRatingB } = calculateElo(
        currentEloA,
        currentEloB,
        ctx.body.modelAScore,
        ctx.body.modelBScore
      );

      // Determine winner ID if winner slug is provided
      let winnerId: number | null = null;
      if (ctx.body.winnerSlug) {
        // If winner matches one of the models, use the already-looked-up ID
        if (ctx.body.winnerSlug === ctx.body.modelASlug) {
          winnerId = modelAId;
        } else if (ctx.body.winnerSlug === ctx.body.modelBSlug) {
          winnerId = modelBId;
        } else {
          // Winner is a different model - look it up by slug
          const winner = await tx
            .select({ id: providerModelsTable.id })
            .from(providerModelsTable)
            .where(eq(providerModelsTable.modelId, ctx.body.winnerSlug))
            .limit(1);

          if (winner[0]) {
            winnerId = winner[0].id;
          }
        }
      }

      // Save the match
      const [insertedMatch] = await tx
        .insert(modelMatchesTable)
        .values({
          modelAId,
          modelBId,
          winnerId,
          promptId: ctx.body.promptId,
          modelAResponseId: ctx.body.modelAResponseId,
          modelBResponseId: ctx.body.modelBResponseId,
        })
        .returning({ id: modelMatchesTable.id });

      if (!insertedMatch) {
        throw new Error("Failed to insert model match");
      }

      // Update ELO ratings
      await Promise.all([
        tx
          .update(providerModelsTable)
          .set({ elo: newRatingA })
          .where(eq(providerModelsTable.id, modelAId)),
        tx
          .update(providerModelsTable)
          .set({ elo: newRatingB })
          .where(eq(providerModelsTable.id, modelBId)),
      ]);

      return insertedMatch.id;
    });

    return NextResponse.json({
      success: true,
      message: "Model match saved and ELO ratings updated successfully",
      data: {
        matchId,
      },
    });
  });

export type RequestBodyType = z.infer<typeof bodySchema>;
export type ResponseType = {
  success: boolean;
  message: string;
  data: {
    matchId: string;
  };
};
