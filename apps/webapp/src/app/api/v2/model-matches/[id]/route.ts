import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import { NextResponse } from "next/server";
import { db } from "@/database/client";
import {
  modelMatchesTable,
  providerModelsTable,
  promptsTable,
  responsesTable,
} from "@/database/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "@/errors/api-error";

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const { id } = await ctx.params;

    if (!id || typeof id !== "string") {
      throw ApiError.badRequest("Invalid match ID");
    }

    // Fetch the model match with all related data
    const match = await db
      .select({
        id: modelMatchesTable.id,
        winnerId: modelMatchesTable.winnerId,
        isShareable: modelMatchesTable.isShareable,
        createdAt: modelMatchesTable.createdAt,
        modelAResponseId: modelMatchesTable.modelAResponseId,
        modelBResponseId: modelMatchesTable.modelBResponseId,

        // Model A details
        modelAId: providerModelsTable.id,
        modelAName: providerModelsTable.name,
        modelAProvider: providerModelsTable.provider,
        modelAModelId: providerModelsTable.modelId,
        modelAOwner: providerModelsTable.owner,
        modelAHost: providerModelsTable.host,
        modelAElo: providerModelsTable.elo,

        // Prompt details
        promptId: promptsTable.id,
        promptQuestion: promptsTable.question,
        promptFullPrompt: promptsTable.fullPrompt,
        promptType: promptsTable.type,
      })
      .from(modelMatchesTable)
      .innerJoin(
        providerModelsTable,
        eq(modelMatchesTable.modelAId, providerModelsTable.id)
      )
      .innerJoin(promptsTable, eq(modelMatchesTable.promptId, promptsTable.id))
      .where(eq(modelMatchesTable.id, id))
      .limit(1);

    if (!match[0]) {
      throw ApiError.notFound("Model match not found");
    }

    // Check if the match is shareable
    // Return 404 for non-shareable matches regardless of authentication
    // This endpoint is specifically for shared/public access
    if (!match[0].isShareable) {
      throw ApiError.notFound("Model match not found");
    }

    // Get Model B details separately
    const modelB = await db
      .select({
        id: providerModelsTable.id,
        name: providerModelsTable.name,
        provider: providerModelsTable.provider,
        modelId: providerModelsTable.modelId,
        owner: providerModelsTable.owner,
        host: providerModelsTable.host,
        elo: providerModelsTable.elo,
      })
      .from(modelMatchesTable)
      .innerJoin(
        providerModelsTable,
        eq(modelMatchesTable.modelBId, providerModelsTable.id)
      )
      .where(eq(modelMatchesTable.id, id))
      .limit(1);

    // Get response A if we have the ID
    let responseAData = null;
    if (match[0].modelAResponseId) {
      const result = await db
        .select()
        .from(responsesTable)
        .where(eq(responsesTable.id, match[0].modelAResponseId))
        .limit(1);
      responseAData = result[0] || null;
    }

    // Get response B if we have the ID
    let responseBData = null;
    if (match[0].modelBResponseId) {
      const result = await db
        .select()
        .from(responsesTable)
        .where(eq(responsesTable.id, match[0].modelBResponseId))
        .limit(1);
      responseBData = result[0] || null;
    }

    const matchData = {
      id: match[0].id,
      winnerId: match[0].winnerId,
      isShareable: match[0].isShareable,
      createdAt: match[0].createdAt,

      modelA: {
        id: match[0].modelAId,
        name: match[0].modelAName,
        provider: match[0].modelAProvider,
        modelId: match[0].modelAModelId,
        owner: match[0].modelAOwner,
        host: match[0].modelAHost,
        elo: match[0].modelAElo,
      },

      modelB: modelB[0]
        ? {
            id: modelB[0].id,
            name: modelB[0].name,
            provider: modelB[0].provider,
            modelId: modelB[0].modelId,
            owner: modelB[0].owner,
            host: modelB[0].host,
            elo: modelB[0].elo,
          }
        : null,

      prompt: {
        id: match[0].promptId,
        question: match[0].promptQuestion,
        fullPrompt: match[0].promptFullPrompt,
        type: match[0].promptType,
      },

      responseA: responseAData,
      responseB: responseBData,
    };

    return NextResponse.json({
      success: true,
      data: matchData,
    });
  });

export type ResponseType = {
  success: boolean;
  data: {
    id: string;
    winnerId: number | null;
    isShareable: boolean;
    createdAt: Date;
    modelA: {
      id: number;
      name: string;
      provider: string;
      modelId: string;
      owner: string;
      host: string;
      elo: number | null;
    };
    modelB: {
      id: number;
      name: string;
      provider: string;
      modelId: string;
      owner: string;
      host: string;
      elo: number | null;
    } | null;
    prompt: {
      id: string;
      question: string;
      fullPrompt: string;
      type: string;
    };
    responseA: any;
    responseB: any;
  };
};
