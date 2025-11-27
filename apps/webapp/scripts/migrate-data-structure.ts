/**
 * An endpoint that can be used to migrate an old Prompt/Response/Score schema to the new one.
 * It walks through all the data from the database and migrates the raw data to the new schema.
 * It keeps the UUIDs as the same. Also updates the hash calculations (since they will be different for new schema)
 *
 * CAUTION:
 * This file is supposed to be executed via Next.js API route since
 * it uses the existing code of the web application. To do that:
 * 1. Create a new API route in the `src/app/api/<name-it>/route.ts` file.
 * 2. Copy the content of this file to the new one
 * 3. Call that new endpoint and wait until it is done
 *
 * > You don't need to build with that endpoint. Just ensure that you are using the correct
 * > environment variables then just run it via `npm run dev` then call the endpoint. Once
 * > you are done, remove that endpoint.
 */

import { db } from "@/database/client";
import {
  hashRegistrationsTable,
  rawDataRegistrationsTable,
  responsesTable,
  scoresTable,
} from "@/database/schema";
import { DbTx } from "@/types/db";
import {
  calculateCID,
  calculateSHA256,
  PromptResponse,
  PromptResponseSchema,
  PromptSchema,
  PromptScore,
  PromptScoreSchema,
  PromptTypes,
  removeDIDPrefix,
  ScoringMethods,
  stableStringify,
} from "peerbench";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

function DIDSchema<Input, Output>(
  schema: z.ZodSchema<Input, z.ZodTypeDef, Output>
) {
  return (
    z
      .string()
      // TODO: Maybe in the future we can force "did:<entity type>:" prefix
      // .startsWith("did:....")
      .transform((val) => removeDIDPrefix(val))
      .pipe(schema)
  );
}

const DIDasUUIDSchema = DIDSchema(z.string().uuid({ message: "Invalid DID" }));

export const OldPromptSchema = z
  .object({
    /**
     * Unique identifier of the Prompt
     */
    promptUUID: DIDasUUIDSchema, // This schema also accepts without `did:<entity type>:` prefix

    /**
     * Prompt data itself
     */
    prompt: z.string(),

    /**
     * CID v1 calculation of the Prompt string
     */
    promptCID: z.string(),

    /**
     * SHA256 hash of the Prompt string
     */
    promptSHA256: z.string(),

    /**
     * Multiple choice answers for the question where the keys are letters and the values are the answers.
     */
    options: z.record(z.string(), z.string()).optional(),

    /**
     * Full Prompt string that is being sent
     */
    fullPrompt: z.string(),

    /**
     * CID v1 calculation of the full Prompt string
     */
    fullPromptCID: z.string(),

    /**
     * SHA256 hash of the full Prompt string
     */
    fullPromptSHA256: z.string(),

    /**
     * Type of the Prompt
     */
    type: z.nativeEnum(PromptTypes),

    /**
     * Expected option value for the question
     */
    answer: z.string().optional(),

    /**
     * Expected letter of the answer (e.g "A", "B" or "C")
     */
    answerKey: z.string().optional(),

    /**
     * Additional metadata related to the Prompt
     */
    metadata: z.record(z.string(), z.any()).optional(),

    /**
     * Expected Scorer identifiers that can be used to
     * score the Responses for this Prompt
     */
    scorers: z.array(z.string()).optional(),
  })
  .transform((prompt, ctx) => {
    if (prompt.type === PromptTypes.MultipleChoice) {
      if (Object.keys(prompt.options || {}).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "No options provided for multiple choice question",
        });
        return z.NEVER;
      }

      if (
        Object.values(prompt.options || {}).some(
          (value) => value?.trim() === ""
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Multiple choice options cannot be empty",
        });
        return z.NEVER;
      }

      if (!prompt.answerKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Correct answer key cannot be empty",
        });
        return z.NEVER;
      }

      if (!prompt.answer) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Correct answer value cannot be empty",
        });
        return z.NEVER;
      }
    }

    return prompt;
  });

export const OldNonRevealedPromptSchema = PromptSchema.sourceType().extend({
  prompt: z.undefined().catch(undefined),
  fullPrompt: z.undefined().catch(undefined),
  options: z.undefined().catch(undefined),
  answer: z.undefined().catch(undefined),
  answerKey: z.undefined().catch(undefined),
});

/**
 * peerBench Prompt object
 */
export type OldPrompt = z.infer<typeof OldPromptSchema>;

/**
 * Non-revealed peerBench Prompt object (not including the original Prompt data but only hashes)
 */
export type OldNonRevealedPrompt = z.infer<typeof OldNonRevealedPromptSchema>;

export const OldPromptResponseSchema = z.object({
  /**
   * Unique identifier of the Response
   */
  did: DIDasUUIDSchema,

  /**
   * Name of the Provider that the Response comes from
   */
  provider: z.string(),

  /**
   * ID of the Model that was used by the Provider
   */
  modelId: z.string(),

  /**
   * Known name of the model by peerBench
   */
  modelName: z.string(),

  /**
   * Owner of the model
   */
  modelOwner: z.string(),

  /**
   * The entity that responsible for hosting the model
   */
  modelHost: z.string(),

  /**
   * The Prompt that used to achieve this Response.
   */
  prompt: PromptSchema,

  /**
   * CID v1 calculation of the Response data.
   */
  cid: z.string(),

  /**
   * SHA256 calculation of the Response data.
   */
  sha256: z.string(),

  /**
   * Response data itself.
   */
  data: z.string(),

  /**
   * Timestamp when the Prompt sent to the Model
   */
  startedAt: z.number(),

  /**
   * Timestamp when the Model responded this particular Prompt.
   */
  finishedAt: z.number(),

  /**
   * Unique identifier of which run this Response belongs to
   */
  runId: z.string(),

  inputTokensUsed: z.number().optional(),
  outputTokensUsed: z.number().optional(),
  inputCost: z.string().optional(),
  outputCost: z.string().optional(),

  metadata: z.record(z.string(), z.any()).optional(),
});

export const OldNonRevealedPromptResponseSchema =
  OldPromptResponseSchema.extend({
    data: z.undefined().catch(undefined),
    prompt: OldNonRevealedPromptSchema,
  });

export type OldPromptResponse = z.infer<typeof OldPromptResponseSchema>;
export type OldNonRevealedPromptResponse = z.infer<
  typeof OldNonRevealedPromptResponseSchema
>;

export const OldPromptScoreSchema = OldPromptResponseSchema.extend({
  prompt:
    // Modify some of the fields of the Prompt in case
    // if the Score object doesn't want to include original Prompt data
    OldPromptSchema.sourceType()
      .extend({
        options: OldPromptSchema.sourceType().shape.options.optional(),

        prompt: OldPromptSchema.sourceType().shape.prompt.optional(),
        fullPrompt: OldPromptSchema.sourceType().shape.fullPrompt.optional(),

        type: OldPromptSchema.sourceType().shape.type.optional(),
        answer: OldPromptSchema.sourceType().shape.answer.optional(),
        answerKey: OldPromptSchema.sourceType().shape.answerKey.optional(),
      })
      .optional(),
  data: z.string().optional(),

  /**
   * Unique identifier of this Scoring result. This is named
   * like this because `did` field represents the Response ID since
   * the Score object inherits from the Response object.
   */
  scoreDID: DIDasUUIDSchema,

  /**
   * Additional metadata about the Scoring result. This is named
   * like this because `metadata` field represents the Response metadata since
   * the Score object inherits from the Response object.
   */
  scoreMetadata: z.record(z.string(), z.any()).optional(),

  score: z.number().min(0).max(1),
  method: z.nativeEnum(ScoringMethods),

  /**
   * Explanation about how the score was calculated.
   */
  explanation: z.string().optional(),

  // Only presented if the scoring method is `ai`
  scorerAI: z
    .object({
      provider: z.string(),
      modelName: z.string(),
      modelHost: z.string(),
      modelOwner: z.string(),
      modelId: z.string(),

      inputTokensUsed: z.number().optional(),
      outputTokensUsed: z.number().optional(),
      inputCost: z.string().optional(),
      outputCost: z.string().optional(),
    })
    .optional(),
});
export type OldPromptScore = z.infer<typeof OldPromptScoreSchema>;

async function migrateOldResponseData(params: {
  tx: DbTx;
  oldResponseSha256Registration: string;
  oldResponseCIDRegistration: string;
  newResponse: PromptResponse;
}) {
  const newResponseRawData = stableStringify(params.newResponse)!;
  const newResponseSha256 = await calculateSHA256(newResponseRawData);
  const newResponseCID = await calculateCID(newResponseRawData).then((c) =>
    c.toString()
  );

  await params.tx
    .update(responsesTable)
    .set({
      hashSha256Registration: newResponseSha256,
      hashCIDRegistration: newResponseCID,
    })
    .where(
      and(
        eq(
          responsesTable.hashSha256Registration,
          params.oldResponseSha256Registration
        ),
        eq(
          responsesTable.hashCIDRegistration,
          params.oldResponseCIDRegistration
        )
      )
    );

  await params.tx
    .update(rawDataRegistrationsTable)
    .set({
      sha256: newResponseSha256,
      cid: newResponseCID,
      rawData: newResponseRawData,
    })
    .where(
      and(
        eq(
          rawDataRegistrationsTable.sha256,
          params.oldResponseSha256Registration
        ),
        eq(rawDataRegistrationsTable.cid, params.oldResponseCIDRegistration)
      )
    );

  await params.tx
    .update(hashRegistrationsTable)
    .set({
      sha256: newResponseSha256,
      cid: newResponseCID,
    })
    .where(
      and(
        eq(hashRegistrationsTable.sha256, params.oldResponseSha256Registration),
        eq(hashRegistrationsTable.cid, params.oldResponseCIDRegistration)
      )
    );

  await params.tx
    .update(scoresTable)
    .set({
      responseHashSha256Registration: newResponseSha256,
      responseHashCIDRegistration: newResponseCID,
    })
    .where(
      and(
        eq(
          scoresTable.responseHashSha256Registration,
          params.oldResponseSha256Registration
        ),
        eq(
          scoresTable.responseHashCIDRegistration,
          params.oldResponseCIDRegistration
        )
      )
    );
}

async function migrateOldScoreData(params: {
  tx: DbTx;
  oldScoreSha256Registration: string;
  oldScoreCIDRegistration: string;
  newScore: PromptScore;
}) {
  const newScoreRawData = stableStringify(params.newScore)!;
  const newScoreSha256 = await calculateSHA256(newScoreRawData);
  const newScoreCID = await calculateCID(newScoreRawData).then((c) =>
    c.toString()
  );

  await params.tx
    .update(scoresTable)
    .set({
      hashSha256Registration: newScoreSha256,
      hashCIDRegistration: newScoreCID,
    })
    .where(
      and(
        eq(
          scoresTable.hashSha256Registration,
          params.oldScoreSha256Registration
        ),
        eq(scoresTable.hashCIDRegistration, params.oldScoreCIDRegistration)
      )
    );

  await params.tx
    .update(rawDataRegistrationsTable)
    .set({
      sha256: newScoreSha256,
      cid: newScoreCID,
      rawData: newScoreRawData,
    })
    .where(
      and(
        eq(rawDataRegistrationsTable.sha256, params.oldScoreSha256Registration),
        eq(rawDataRegistrationsTable.cid, params.oldScoreCIDRegistration)
      )
    );

  await params.tx
    .update(hashRegistrationsTable)
    .set({
      sha256: newScoreSha256,
      cid: newScoreCID,
    })
    .where(
      and(
        eq(hashRegistrationsTable.sha256, params.oldScoreSha256Registration),
        eq(hashRegistrationsTable.cid, params.oldScoreCIDRegistration)
      )
    );
}

async function processResponseMigration(
  tx: DbTx,
  rawData: { raw: string; sha256: string; cid: string },
  oldResponse: z.infer<typeof OldPromptResponseSchema>
) {
  await migrateOldResponseData({
    tx,
    oldResponseSha256Registration: rawData.sha256,
    oldResponseCIDRegistration: rawData.cid,
    newResponse: {
      responseUUID: oldResponse.did,
      runId: oldResponse.runId,
      response: oldResponse.data,
      responseSHA256: oldResponse.sha256,
      responseCID: oldResponse.cid,
      modelSlug: oldResponse.modelId,
      provider: oldResponse.provider,
      startedAt: oldResponse.startedAt,
      finishedAt: oldResponse.finishedAt,
      prompt: oldResponse.prompt,
      inputTokensUsed: oldResponse.inputTokensUsed,
      outputTokensUsed: oldResponse.outputTokensUsed,
      inputCost: oldResponse.inputCost,
      outputCost: oldResponse.outputCost,
      responseMetadata: oldResponse.metadata,
    },
  });
}

async function processScoreMigration(
  tx: DbTx,
  rawData: { raw: string; sha256: string; cid: string },
  oldScore: z.infer<typeof OldPromptScoreSchema>
) {
  if (!oldScore.prompt) {
    throw new Error(`Prompt is not presented in score ${oldScore.scoreDID}`);
  }

  await migrateOldScoreData({
    tx,
    oldScoreSha256Registration: rawData.sha256,
    oldScoreCIDRegistration: rawData.cid,
    newScore: {
      responseUUID: oldScore.did,
      runId: oldScore.runId,
      response: oldScore.data,
      responseSHA256: oldScore.sha256,
      responseCID: oldScore.cid,
      modelSlug: oldScore.modelId,
      provider: oldScore.provider,
      startedAt: oldScore.startedAt,
      finishedAt: oldScore.finishedAt,
      prompt: oldScore.prompt!,
      scoreUUID: oldScore.scoreDID,
      scoreMetadata: oldScore.scoreMetadata,
      score: oldScore.score,
      method: oldScore.method,
      explanation: oldScore.explanation,
      scorerAIProvider: oldScore.scorerAI?.provider,
      scorerAIModelSlug: oldScore.scorerAI?.modelId,
      scorerAIInputTokensUsed: oldScore.scorerAI?.inputTokensUsed,
      scorerAIOutputTokensUsed: oldScore.scorerAI?.outputTokensUsed,
      scorerAIInputCost: oldScore.scorerAI?.inputCost,
      scorerAIOutputCost: oldScore.scorerAI?.outputCost,
      inputTokensUsed: oldScore.inputTokensUsed,
      outputTokensUsed: oldScore.outputTokensUsed,
      inputCost: oldScore.inputCost,
      outputCost: oldScore.outputCost,
      responseMetadata: oldScore.metadata,
    },
  });
}

export async function GET() {
  await db.transaction(async (tx) => {
    const rawDatas = await tx
      .select({
        raw: rawDataRegistrationsTable.rawData,
        cid: rawDataRegistrationsTable.cid,
        sha256: rawDataRegistrationsTable.sha256,
      })
      .from(rawDataRegistrationsTable);

    let i = 0;
    for (const rawData of rawDatas) {
      if (++i % 100 === 0) {
        console.log(`Processing ${i} of ${rawDatas.length}`);
      }

      try {
        const obj = JSON.parse(rawData.raw);

        // Object is already following the current defined schema.
        if (
          PromptScoreSchema.safeParse(obj).success ||
          PromptResponseSchema.safeParse(obj).success ||
          PromptSchema.safeParse(obj).success
        ) {
          continue;
        }

        // Try to validate and migrate as Score
        const scoreValidation = OldPromptScoreSchema.safeParse(obj);
        if (scoreValidation.success) {
          await processScoreMigration(tx, rawData, scoreValidation.data);
          continue;
        }

        // Try to validate and migrate as Response
        const responseValidation = OldPromptResponseSchema.safeParse(obj);
        if (responseValidation.success) {
          await processResponseMigration(tx, rawData, responseValidation.data);
          continue;
        }

        // Try to validate and migrate as Prompt
        const promptValidation = OldPromptSchema.safeParse(obj);
        if (promptValidation.success) {
          console.log("Prompt data is already up to date");
          continue;
        }

        // If none of the validations succeeded, log and skip
        console.log(
          "Unknown raw data",
          rawData.sha256,
          rawData.cid,
          obj,
          responseValidation.error,
          promptValidation.error,
          scoreValidation.error
        );
      } catch (error) {
        console.error(
          `Error processing ${rawData.sha256}, ${rawData.cid}`,
          error
        );
      }
    }
  });
}
