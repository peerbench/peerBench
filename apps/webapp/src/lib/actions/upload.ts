"use server";

import { bodySchema as promptsBodySchema } from "@/app/api/v2/prompts/post";
import { bodySchema as responsesBodySchema } from "@/app/api/v2/responses/post";
import { bodySchema as scoresBodySchema } from "@/app/api/v2/scores/post";
import { bodySchema as hashesBodySchema } from "@/app/api/v2/hashes/post";
import { db } from "@/database/client";
import { getUser } from "@/lib/actions/auth";
import { PromptResponseService } from "@/services/prompt-response.service";
import { PromptScoreService } from "@/services/prompt-score.service";
import { PromptService } from "@/services/prompt.service";
import { z } from "zod";
import { HashService } from "@/services/hash.service";
import { revalidatePath } from "next/cache";

type PromptUploadParams = z.input<typeof promptsBodySchema>;
type ResponseUploadParams = z.input<typeof responsesBodySchema>;
type ScoreUploadParams = z.input<typeof scoresBodySchema>;
type HashUploadParams = z.input<typeof hashesBodySchema>;

/**
 * Upload all the given entities
 */
export async function uploadAction(params: {
  promptSetId?: PromptUploadParams["promptSetId"];
  prompts?: PromptUploadParams["prompts"];

  hashes?: HashUploadParams["hashes"];
  responses?: ResponseUploadParams["responses"];
  scores?: ScoreUploadParams["scores"];
}) {
  // Authenticate the user
  const user = await getUser();
  if (!user) {
    return {
      error: "Unauthorized",
    };
  }

  // Validate the input data coming from the client
  const promptsValidation = promptsBodySchema.safeParse({
    promptSetId: params.promptSetId,
    prompts: params.prompts,
  });
  const responsesValidation = responsesBodySchema.safeParse({
    responses: params.responses,
  });
  const scoresValidation = scoresBodySchema.safeParse({
    scores: params.scores,
  });
  const hashesValidation = hashesBodySchema.safeParse({
    hashes: params.hashes,
  });

  try {
    // Atomic transaction for all the entities
    await db.transaction(async (tx) => {
      if (hashesValidation.success) {
        await HashService.insertHashes(
          {
            hashes: hashesValidation.data.hashes,
            uploaderId: user.id,
          },
          { tx }
        );
      }

      if (promptsValidation.success) {
        await PromptService.insertPrompts(
          {
            prompts: promptsValidation.data.prompts,
            promptSetId: promptsValidation.data.promptSetId,
            uploaderId: user.id,
          },
          { tx, requestedByUserId: user.id }
        );

        revalidatePath(
          `/prompt-sets/view/${promptsValidation.data.promptSetId}`
        );
      }

      if (responsesValidation.success) {
        await PromptResponseService.insertPromptResponses(
          {
            responses: responsesValidation.data.responses,
            uploaderId: user.id,
          },
          { tx, requestedByUserId: user.id }
        );

        // TODO: Maybe we can revalidate only the Prompts that were affected by the new Responses? But probably this will be too much overhead.
        revalidatePath(`/prompts/[id]`, "page");
      }

      if (scoresValidation.success) {
        await PromptScoreService.insertPromptScores(
          {
            scores: scoresValidation.data.scores,
            uploaderId: user.id,
          },
          { tx, requestedByUserId: user.id }
        );

        // TODO: Maybe we can revalidate only the Prompts and Prompt Sets that were affected by the new Scores? But probably this will be too much overhead.
        revalidatePath(`/prompts/[id]`, "page");
        revalidatePath(`/prompt-sets/view/[id]`, "page");
      }
    });
  } catch (err) {
    console.error(err);

    return {
      error: "Failed to upload data. Please try again.",
    };
  }
}

export type PromptToBeUploaded = PromptUploadParams["prompts"][number];
export type ResponseToBeUploaded = ResponseUploadParams["responses"][number];
export type ScoreToBeUploaded = ScoreUploadParams["scores"][number];
