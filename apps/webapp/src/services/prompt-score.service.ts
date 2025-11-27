import { excluded, withTxOrDb, withTxOrTx } from "@/database/helpers";
import { paginateQuery } from "@/database/query";
import {
  DbHashRegistrationInsert,
  DbRawDataRegistrationInsert,
  DbScoreInsert,
  hashRegistrationsTable,
  providerModelsTable,
  promptSetPrompts,
  promptSetsTable,
  promptsTable,
  quickFeedbackFlagsTable,
  quickFeedbacks_quickFeedbackFlagsTable,
  quickFeedbacksTable,
  rawDataRegistrationsTable,
  responsesTable,
  scoresTable,
  userRoleOnPromptSetTable,
} from "@/database/schema";
import {
  QuickFeedbackOpinion,
  SignatureKeyType,
  SignatureType,
  UserRoleOnPromptSet,
} from "@/database/types";
import { ApiError } from "@/errors/api-error";
import { ADMIN_USER_ID, NULL_UUID } from "@/lib/constants";
import { DbOptions, DbTx, PaginationOptions } from "@/types/db";
import { baseScoreIdentifierSchema } from "@/validation/base-score-identifier";
import {
  calculateCID,
  calculateSHA256,
  PromptScore,
  removeDIDPrefix,
  ScoringMethods,
  stableStringify,
} from "peerbench";
import {
  and,
  count,
  eq,
  inArray,
  sql,
  SQL,
  or,
  countDistinct,
} from "drizzle-orm";
import { QuickFeedbackService } from "./quickfeedback.service";
import { ModelService } from "./model.service";
import Decimal from "decimal.js";
import { z } from "zod";

export class PromptScoreService {
  static async insertPromptScores(
    data: {
      scores: (PromptScore & {
        responseHashSha256Registration: string;
        responseHashCIDRegistration: string;
        promptHashSha256Registration: string;
        promptHashCIDRegistration: string;
        scorerUserId?: string;
        signature?: string;
        publicKey?: string;
        signatureType?: SignatureType;
        keyType?: SignatureKeyType;
      })[];
      uploaderId: string;
    },
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrTx(async (tx) => {
      // Deduplicate the Response IDs to have correct count
      // when applying ACL rules.
      const responseIds = [
        ...new Set(
          data.scores.map((score) => removeDIDPrefix(score.responseUUID))
        ),
      ];

      // Check ACL rules if the requested user is specified
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        // Check if the user has permission to upload Responses to any of the Prompt Sets that the each Prompt is included in.
        const { count } = await tx
          .select({
            count: countDistinct(responsesTable.id),
          })
          .from(promptsTable)
          .innerJoin(
            promptSetPrompts,
            eq(promptSetPrompts.promptId, promptsTable.id)
          )
          .innerJoin(
            promptSetsTable,
            eq(promptSetsTable.id, promptSetPrompts.promptSetId)
          )
          .innerJoin(
            responsesTable,
            eq(responsesTable.promptId, promptsTable.id)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
          )
          .where(
            and(
              inArray(responsesTable.id, responseIds),
              or(
                and(
                  eq(promptSetsTable.isPublic, true),
                  eq(promptSetsTable.isPublicSubmissionsAllowed, true)
                ),
                inArray(userRoleOnPromptSetTable.role, [
                  UserRoleOnPromptSet.admin,
                  UserRoleOnPromptSet.owner,
                  UserRoleOnPromptSet.collaborator,
                ])
              )
            )
          )
          .then((r) => r[0] ?? { count: 0 });

        // If the count that we've got from the query is not the same as the number of Responses,
        // that means some of the Responses weren't counted by the query because user
        // didn't have enough permissions (aka some of the conditions didn't match).
        if (count !== responseIds.length) {
          throw ApiError.forbidden();
        }
      }

      // Prepare the rows to be inserted
      const hashRegistrations: DbHashRegistrationInsert[] = [];
      const rawDataRegistrations: DbRawDataRegistrationInsert[] = [];
      const scores: DbScoreInsert[] = [];

      const modelsToBeSearched: {
        provider: string;
        modelId: string;
        perMillionTokenInputCost?: string;
        perMillionTokenOutputCost?: string;
      }[] = [];
      for (const score of data.scores) {
        if (
          score.scorerAIProvider !== undefined &&
          score.scorerAIModelSlug !== undefined &&
          !modelsToBeSearched.some((m) => m.modelId === score.scorerAIModelSlug)
        ) {
          modelsToBeSearched.push({
            provider: score.scorerAIProvider,
            modelId: score.scorerAIModelSlug,
            perMillionTokenInputCost:
              score.scorerAIInputCost && score.scorerAIInputTokensUsed
                ? new Decimal(score.scorerAIInputCost)
                    .div(score.scorerAIInputTokensUsed)
                    .mul(1000000)
                    .toFixed(14)
                : undefined,
            perMillionTokenOutputCost:
              score.scorerAIOutputCost && score.scorerAIOutputTokensUsed
                ? new Decimal(score.scorerAIOutputCost)
                    .div(score.scorerAIOutputTokensUsed)
                    .mul(1000000)
                    .toFixed(14)
                : undefined,
          });
        }
      }

      // Upsert and get the model IDs
      const providerModels =
        modelsToBeSearched.length > 0
          ? await ModelService.upsertProviderModels(modelsToBeSearched, {
              tx,
            })
          : [];

      let index = 0;
      for (const promptScore of data.scores) {
        // Stringify the original Score object without additional params
        const rawData = stableStringify({
          ...promptScore,

          scorerUserId: undefined,
          responseHashSha256Registration: undefined,
          responseHashCIDRegistration: undefined,
          promptHashSha256Registration: undefined,
          promptHashCIDRegistration: undefined,
          signature: undefined,
          publicKey: undefined,
          signatureType: undefined,
          keyType: undefined,
        });

        if (rawData === undefined) {
          throw ApiError.badRequest(`Invalid Score object at index ${index}`);
        }

        const providerModelId = providerModels.find(
          (m) => m.modelId === promptScore.scorerAIModelSlug
        )?.id;

        // Score produced by an AI model, but in our
        // database we don't have information about it.
        if (
          providerModelId === undefined &&
          promptScore.method === ScoringMethods.ai
        ) {
          throw ApiError.badRequest(
            `Unknown Scorer model from Score: ${promptScore.scoreUUID}`
          );
        }

        const cid = await calculateCID(rawData).then((c) => c.toString());
        const sha256 = await calculateSHA256(rawData);

        rawDataRegistrations.push({
          rawData,
          cid,
          sha256,
          publicKey: promptScore.publicKey,
          uploaderId: data.uploaderId,
        });
        scores.push({
          id: removeDIDPrefix(promptScore.scoreUUID),
          score: promptScore.score,
          scoringMethod: promptScore.method,
          promptId: removeDIDPrefix(promptScore.prompt!.promptUUID),
          responseId: removeDIDPrefix(promptScore.responseUUID),
          scorerUserId: promptScore.scorerUserId ?? data.uploaderId,
          explanation: promptScore.explanation,
          metadata: promptScore.scoreMetadata,

          responseHashCIDRegistration: promptScore.responseHashCIDRegistration,
          responseHashSha256Registration:
            promptScore.responseHashSha256Registration,

          promptHashCIDRegistration: promptScore.promptHashCIDRegistration,
          promptHashSha256Registration:
            promptScore.promptHashSha256Registration,

          hashCIDRegistration: cid,
          hashSha256Registration: sha256,
          uploaderId: data.uploaderId,

          inputTokensUsed: promptScore.scorerAIInputTokensUsed,
          outputTokensUsed: promptScore.scorerAIOutputTokensUsed,
          inputCost: promptScore.scorerAIInputCost,
          outputCost: promptScore.scorerAIOutputCost,
          scorerModelId: providerModelId,
        });

        hashRegistrations.push({
          cid,
          sha256,
          signature: promptScore.signature,
          publicKey: promptScore.publicKey,
          signatureType: promptScore.signatureType,
          keyType: promptScore.keyType,
          uploaderId: data.uploaderId,
        });

        index += 1;
      }

      // Insert hash registrations
      await tx
        .insert(hashRegistrationsTable)
        .values(hashRegistrations)
        .onConflictDoNothing();

      // Insert raw data
      await tx
        .insert(rawDataRegistrationsTable)
        .values(rawDataRegistrations)
        .onConflictDoUpdate({
          target: [
            rawDataRegistrationsTable.cid,
            rawDataRegistrationsTable.sha256,
          ],
          set: {
            rawData: excluded(rawDataRegistrationsTable.rawData),
          },
        });

      // Insert Scores
      await tx.insert(scoresTable).values(scores).onConflictDoNothing();

      // Update "updatedAt" of the Prompt Sets
      const sq = tx
        .select({
          promptSetId: promptSetPrompts.promptSetId,
        })
        .from(promptSetsTable)
        .leftJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptSetId, promptSetsTable.id)
        )
        .leftJoin(promptsTable, eq(promptSetPrompts.promptId, promptsTable.id))
        .leftJoin(responsesTable, eq(responsesTable.promptId, promptsTable.id))
        .where(inArray(responsesTable.id, responseIds)) // Only get the relevant Prompt Sets that have a indirect relationship with the Responses that are the Scores generated for.
        .groupBy(promptSetPrompts.promptSetId)
        .as("sq");
      await tx
        .update(promptSetsTable)
        .set({ updatedAt: sql`NOW()` })
        .from(sq)
        .where(eq(promptSetsTable.id, sq.promptSetId));
    }, options?.tx);
  }

  static async getPromptScoresStatuses(
    options: DbOptions & {
      scores: z.infer<typeof baseScoreIdentifierSchema>[];
    }
  ) {
    return withTxOrDb(async (tx) => {
      const query = tx
        .select({
          id: scoresTable.id,
          hashSha256Registration: scoresTable.hashSha256Registration,
          hashCIDRegistration: scoresTable.hashCIDRegistration,
        })
        .from(scoresTable)
        .where(
          or(
            ...options.scores.map((score) =>
              and(
                eq(scoresTable.id, score.id),
                eq(
                  scoresTable.hashSha256Registration,
                  score.hashSha256Registration
                ),
                eq(scoresTable.hashCIDRegistration, score.hashCIDRegistration)
              )
            )
          )
        )
        .$dynamic();

      const queryResult = await query;
      const foundScores = [];

      for (const score of options.scores) {
        // Check if the given Score is found in the query result
        const foundScore = queryResult.find(
          (s) =>
            s.id === score.id &&
            s.hashSha256Registration === score.hashSha256Registration &&
            s.hashCIDRegistration === score.hashCIDRegistration
        );

        if (foundScore) {
          foundScores.push({
            id: foundScore.id,
            isRegistered: true as const,
          });
        } else {
          foundScores.push({
            isRegistered: false as const,
          });
        }
      }

      return foundScores;
    }, options?.tx);
  }

  static async getPromptScores(
    options?: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;

        filters?: {
          responseId?: string;
        };
      }
  ) {
    return withTxOrDb(async (tx) => {
      const scoreQuickFeedbacksSubQuery =
        PromptScoreService.buildScoreQuickFeedbacksSubQuery({
          tx,
        });

      const userQuickFeedback = sql<{
        id: number;
        opinion: QuickFeedbackOpinion;
        createdAt: Date;
        flags: (typeof scoreQuickFeedbacksSubQuery)["flags"]["_"]["type"];
      } | null>`
          (jsonb_agg(
            jsonb_build_object(
              'id', ${scoreQuickFeedbacksSubQuery.id},
              'opinion', ${scoreQuickFeedbacksSubQuery.opinion},
              'createdAt', ${scoreQuickFeedbacksSubQuery.createdAt},
              'flags', ${scoreQuickFeedbacksSubQuery.flags}
            )
          ) FILTER (WHERE ${scoreQuickFeedbacksSubQuery.userId} = ${options?.requestedByUserId || NULL_UUID}))->0
        `.as("user_quick_feedback");

      let query = tx
        .with(scoreQuickFeedbacksSubQuery)
        .select({
          id: scoresTable.id,
          score: scoresTable.score,

          promptHashSha256Registration:
            scoresTable.promptHashSha256Registration,
          promptHashCIDRegistration: scoresTable.promptHashCIDRegistration,
          responseHashSha256Registration:
            scoresTable.responseHashSha256Registration,
          responseHashCIDRegistration: scoresTable.responseHashCIDRegistration,
          hashSha256Registration: scoresTable.hashSha256Registration,
          hashCIDRegistration: scoresTable.hashCIDRegistration,

          promptId: scoresTable.promptId,
          responseId: scoresTable.responseId,

          explanation: scoresTable.explanation,

          scoringMethod: scoresTable.scoringMethod,
          scorerUserId: scoresTable.scorerUserId,

          metadata: scoresTable.metadata,
          createdAt: scoresTable.createdAt,

          scorerModelName: providerModelsTable.name,
          scorerModelOwner: providerModelsTable.owner,
          scorerModelProvider: providerModelsTable.provider,
          scorerModelHost: providerModelsTable.host,
          scorerModelId: providerModelsTable.modelId,

          userQuickFeedback,
        })
        .from(scoresTable)
        .leftJoin(
          providerModelsTable,
          eq(providerModelsTable.id, scoresTable.scorerModelId)
        )
        .leftJoin(
          scoreQuickFeedbacksSubQuery,
          eq(scoreQuickFeedbacksSubQuery.scoreId, scoresTable.id)
        )
        .groupBy(scoresTable.id, providerModelsTable.id)
        .$dynamic();
      let countQuery = tx
        .select({ count: count() })
        .from(scoresTable)
        .groupBy(scoresTable.id)
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [];

      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        query = query
          .leftJoin(
            promptSetPrompts,
            eq(promptSetPrompts.promptId, scoresTable.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetsTable.id, promptSetPrompts.promptSetId)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            and(
              eq(
                userRoleOnPromptSetTable.promptSetId,
                promptSetPrompts.promptSetId
              ),
              eq(
                userRoleOnPromptSetTable.userId,
                options.requestedByUserId ?? NULL_UUID
              )
            )
          );
        countQuery = countQuery
          .leftJoin(
            promptSetPrompts,
            eq(promptSetPrompts.promptId, scoresTable.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetPrompts.promptSetId, promptSetsTable.id)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            and(
              eq(
                userRoleOnPromptSetTable.promptSetId,
                promptSetPrompts.promptSetId
              ),
              eq(
                userRoleOnPromptSetTable.userId,
                options.requestedByUserId ?? NULL_UUID
              )
            )
          );

        whereConditions.push(
          or(
            // Apply ACL rules from the Prompt Set that
            // the Response of the Prompt is associated with
            eq(promptSetsTable.isPublic, true),
            inArray(userRoleOnPromptSetTable.role, [
              UserRoleOnPromptSet.admin,
              UserRoleOnPromptSet.owner,
              UserRoleOnPromptSet.collaborator,
              UserRoleOnPromptSet.reviewer,
            ])
          )
        );
      }

      if (options?.filters?.responseId !== undefined) {
        whereConditions.push(
          eq(scoresTable.responseId, options.filters.responseId)
        );
      }

      return await paginateQuery(
        query.where(and(...whereConditions)),
        countQuery.where(and(...whereConditions)),
        {
          page: options?.page,
          pageSize: options?.pageSize,
        }
      );
    }, options?.tx);
  }

  static buildScoreQuickFeedbacksSubQuery(options: {
    tx: DbTx;
    subQueryName?: string;
  }) {
    return options.tx
      .$with(options.subQueryName || "sq_score_quick_feedbacks")
      .as(
        options.tx
          .select({
            id: quickFeedbacksTable.id,
            createdAt: quickFeedbacksTable.createdAt,
            scoreId: quickFeedbacksTable.scoreId,
            opinion: quickFeedbacksTable.opinion,
            userId: quickFeedbacksTable.userId,
            flags:
              QuickFeedbackService.buildQuickFeedbackFlagsAggregation().as(
                "flags"
              ),
          })
          .from(quickFeedbacksTable)
          .leftJoin(
            quickFeedbacks_quickFeedbackFlagsTable,
            eq(
              quickFeedbacks_quickFeedbackFlagsTable.quickFeedbackId,
              quickFeedbacksTable.id
            )
          )
          .leftJoin(
            quickFeedbackFlagsTable,
            eq(
              quickFeedbackFlagsTable.id,
              quickFeedbacks_quickFeedbackFlagsTable.flagId
            )
          )
          .groupBy(quickFeedbacksTable.id, quickFeedbacksTable.userId)
      );
  }
}

export type GetPromptScoresReturnItem = Awaited<
  ReturnType<typeof PromptScoreService.getPromptScores>
>["data"][number];

export type GetPromptScoresStatusReturnItem = Awaited<
  ReturnType<typeof PromptScoreService.getPromptScoresStatuses>
>[number];
