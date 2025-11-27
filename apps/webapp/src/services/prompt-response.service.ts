import { withTxOrDb, withTxOrTx, excluded } from "@/database/helpers";
import { paginateQuery } from "@/database/query";
import {
  DbHashRegistrationInsert,
  DbRawDataRegistrationInsert,
  DbResponseInsert,
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
import { baseResponseIdentifierSchema } from "@/validation/base-response-identifier";
import {
  calculateCID,
  calculateSHA256,
  NonRevealedPromptResponse,
  NonRevealedPromptResponseSchema,
  PromptResponse,
  PromptResponseSchema,
  removeDIDPrefix,
  stableStringify,
} from "peerbench";
import {
  and,
  countDistinct,
  desc,
  eq,
  inArray,
  isNotNull,
  or,
  SQL,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { QuickFeedbackService } from "./quickfeedback.service";
import { ModelService } from "./model.service";
import Decimal from "decimal.js";

export class PromptResponseService {
  static async insertPromptResponses(
    data: {
      responses: ((PromptResponse | NonRevealedPromptResponse) & {
        signature?: string;
        publicKey?: string;
        signatureType?: SignatureType;
        keyType?: SignatureKeyType;

        /**
         * Only presented for the non-revealed objects. Represents
         * the CID and SHA256 calculations of the stable stringified of
         * the full Response object.
         */
        hashCIDRegistration?: string;

        /**
         * Only presented for the non-revealed objects. Represents
         * the CID and SHA256 calculations of the stable stringified of
         * the full Response object.
         */
        hashSha256Registration?: string;
      })[];
      uploaderId: string;
    },
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrTx(async (tx) => {
      // Deduplicate the Prompt IDs to have correct count
      // when applying ACL rules.
      const promptIds = [
        ...new Set(
          data.responses.map((response) =>
            removeDIDPrefix(response.prompt.promptUUID)
          )
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
            count: countDistinct(promptsTable.id),
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
          .leftJoin(
            userRoleOnPromptSetTable,
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
          )
          .where(
            and(
              inArray(promptsTable.id, promptIds),

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

        // If the count that we've got from the query is not the same as the count of unique Prompts
        // that given within the Responses, that means some of the Prompts weren't counted by
        // the query because user didn't have enough permissions (aka some of the conditions didn't match).
        if (count !== promptIds.length) {
          throw ApiError.forbidden();
        }
      }

      // Prepare the rows to be inserted
      const hashRegistrations: DbHashRegistrationInsert[] = [];
      const rawDataRegistrations: DbRawDataRegistrationInsert[] = [];
      const responses: DbResponseInsert[] = [];

      const modelsToBeSearched: {
        provider: string;
        modelId: string;
        perMillionTokenInputCost?: string;
        perMillionTokenOutputCost?: string;
      }[] = [];
      for (const response of data.responses) {
        if (!modelsToBeSearched.some((m) => m.modelId === response.modelSlug)) {
          modelsToBeSearched.push({
            provider: response.provider,
            modelId: response.modelSlug,
            perMillionTokenInputCost:
              response.inputCost && response.inputTokensUsed
                ? new Decimal(response.inputCost)
                    .div(response.inputTokensUsed)
                    .mul(1000000)
                    .toFixed(14)
                : undefined,
            perMillionTokenOutputCost:
              response.outputCost && response.outputTokensUsed
                ? new Decimal(response.outputCost)
                    .div(response.outputTokensUsed)
                    .mul(1000000)
                    .toFixed(14)
                : undefined,
          });
        }
      }

      // Upsert and get the model IDs
      const providerModels = await ModelService.upsertProviderModels(
        modelsToBeSearched,
        { tx }
      );

      for (const response of data.responses) {
        // Use schema to filter additional fields
        const rawObject = z
          .union([PromptResponseSchema, NonRevealedPromptResponseSchema])
          .parse(response);
        const rawData = stableStringify(rawObject)!;

        // Use the provided hash calculations (for the non-revealed version) and
        // fallback to manual calculations from the raw data (for the full object version)
        const cid: string =
          response.hashCIDRegistration ??
          (await calculateCID(rawData).then((c) => c.toString()));
        const sha256 =
          response.hashSha256Registration ?? (await calculateSHA256(rawData));

        // Check if the model info that is provided in the Response object exist in the DB
        const modelId = providerModels.find(
          (m) => m.modelId === response.modelSlug
        )?.id;

        if (modelId === undefined) {
          throw ApiError.badRequest(
            `Unknown model '${response.modelSlug}' from Response: ${response.responseUUID}`
          );
        }

        const isRevealed = response.response !== undefined;

        rawDataRegistrations.push({
          rawData: rawData,
          cid,
          sha256,
          publicKey: response.publicKey,
          uploaderId: data.uploaderId,
        });
        responses.push({
          id: removeDIDPrefix(response.responseUUID),

          data: response.response,
          cid: response.responseCID,
          sha256: response.responseSHA256,

          finishedAt: new Date(response.finishedAt),
          startedAt: new Date(response.startedAt),

          runId: response.runId,

          modelId,
          isRevealed,

          hashCIDRegistration: cid,
          hashSha256Registration: sha256,
          uploaderId: data.uploaderId,

          promptId: removeDIDPrefix(response.prompt.promptUUID),
          inputTokensUsed: response.inputTokensUsed,
          outputTokensUsed: response.outputTokensUsed,
          inputCost: response.inputCost,
          outputCost: response.outputCost,
          metadata: response.responseMetadata,
        });

        hashRegistrations.push({
          cid,
          sha256,
          signature: response.signature,
          publicKey: response.publicKey,
          signatureType: response.signatureType,
          keyType: response.keyType,
          uploaderId: data.uploaderId,
        });
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

      // Insert Responses
      const isResponseRevealed = and(
        isNotNull(excluded(responsesTable.data)),
        eq(
          responsesTable.hashSha256Registration,
          excluded(responsesTable.hashSha256Registration)
        ),
        eq(
          responsesTable.hashCIDRegistration,
          excluded(responsesTable.hashCIDRegistration)
        )
      );
      await tx
        .insert(responsesTable)
        .values(responses)
        .onConflictDoUpdate({
          // Response is already registered, check if the caller is trying to reveal it
          target: [responsesTable.id],
          set: {
            // Only update the columns if the Response is revealed
            data: sql`
              CASE WHEN ${isResponseRevealed} THEN
                ${excluded(responsesTable.data)}
              ELSE
                ${responsesTable.data}
              END
            `,
            isRevealed: sql`
              CASE WHEN ${isResponseRevealed} THEN
                TRUE
              ELSE
                ${responsesTable.isRevealed}
              END
            `,
          },
        });

      // Update "updatedAt" of the Prompt Sets
      const sq = tx
        .select({
          promptSetId: promptSetPrompts.promptSetId,
        })
        .from(promptSetPrompts)
        .where(inArray(promptSetPrompts.promptId, promptIds))
        .groupBy(promptSetPrompts.promptSetId)
        .as("sq");
      await tx
        .update(promptSetsTable)
        .set({ updatedAt: sql`NOW()` })
        .from(sq)
        .where(eq(promptSetsTable.id, sq.promptSetId));
    }, options?.tx);
  }

  static async getPromptResponsesStatuses(
    options: DbOptions & {
      responses: z.infer<typeof baseResponseIdentifierSchema>[];
    }
  ) {
    return withTxOrDb(async (tx) => {
      const query = tx
        .select({
          id: responsesTable.id,
          isRevealed: responsesTable.isRevealed,
          hashSha256Registration: responsesTable.hashSha256Registration,
          hashCIDRegistration: responsesTable.hashCIDRegistration,
        })
        .from(responsesTable)
        .where(
          or(
            ...options.responses.map((response) =>
              and(
                eq(responsesTable.id, response.id),
                eq(
                  responsesTable.hashSha256Registration,
                  response.hashSha256Registration
                ),
                eq(
                  responsesTable.hashCIDRegistration,
                  response.hashCIDRegistration
                )
              )
            )
          )
        )
        .$dynamic();

      const queryResult = await query;
      const foundResponses = [];

      for (const response of options.responses) {
        // Check if the given Response is found in the query result
        const foundResponse = queryResult.find(
          (r) =>
            r.id === response.id &&
            r.hashSha256Registration === response.hashSha256Registration &&
            r.hashCIDRegistration === response.hashCIDRegistration
        );

        if (foundResponse) {
          foundResponses.push({
            id: foundResponse.id,
            isRevealed: foundResponse.isRevealed,
            isRegistered: true as const,
          });
        } else {
          foundResponses.push({
            isRegistered: false as const,
          });
        }
      }

      return foundResponses;
    }, options?.tx);
  }

  static async getPromptResponses(
    options?: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        filters?: {
          promptId?: string;
        };
      }
  ) {
    return withTxOrDb(async (tx) => {
      const responseQuickFeedbacksSubQuery =
        PromptResponseService.buildResponseQuickFeedbacksSubQuery({
          tx,
        });

      const userQuickFeedback = sql<{
        id: number;
        opinion: QuickFeedbackOpinion;
        createdAt: Date;
        flags: (typeof responseQuickFeedbacksSubQuery)["flags"]["_"]["type"];
      } | null>`
          (jsonb_agg(
            jsonb_build_object(
              'id', ${responseQuickFeedbacksSubQuery.id},
              'opinion', ${responseQuickFeedbacksSubQuery.opinion},
              'createdAt', ${responseQuickFeedbacksSubQuery.createdAt},
              'flags', ${responseQuickFeedbacksSubQuery.flags}
            )
          ) FILTER (WHERE ${responseQuickFeedbacksSubQuery.userId} = ${options?.requestedByUserId || NULL_UUID}))->0
        `.as("user_quick_feedback");

      let query = tx
        .with(responseQuickFeedbacksSubQuery)
        .select({
          id: responsesTable.id,
          promptId: responsesTable.promptId,
          runId: responsesTable.runId,
          startedAt: responsesTable.startedAt,
          finishedAt: responsesTable.finishedAt,
          inputTokensUsed: responsesTable.inputTokensUsed,
          outputTokensUsed: responsesTable.outputTokensUsed,
          inputCost: responsesTable.inputCost,
          outputCost: responsesTable.outputCost,
          metadata: responsesTable.metadata,
          data: responsesTable.data,
          cid: responsesTable.cid,
          sha256: responsesTable.sha256,
          hashCIDRegistration: responsesTable.hashCIDRegistration,
          hashSha256Registration: responsesTable.hashSha256Registration,
          createdAt: responsesTable.createdAt,
          updatedAt: responsesTable.updatedAt,
          isRevealed: responsesTable.isRevealed,

          userQuickFeedback,

          totalScoreCount: countDistinct(scoresTable.id),
          avgScore:
            sql<number>`COALESCE(AVG(DISTINCT ${scoresTable.score}), 0)`.mapWith(
              Number
            ),

          modelId: providerModelsTable.modelId,
          modelName: providerModelsTable.name,
          modelOwner: providerModelsTable.owner,
          modelHost: providerModelsTable.host,
          provider: providerModelsTable.provider,
        })
        .from(responsesTable)
        .innerJoin(
          providerModelsTable,
          eq(providerModelsTable.id, responsesTable.modelId)
        )
        .leftJoin(scoresTable, eq(scoresTable.responseId, responsesTable.id))
        .leftJoin(
          responseQuickFeedbacksSubQuery,
          eq(responseQuickFeedbacksSubQuery.responseId, responsesTable.id)
        )
        .orderBy(
          desc(responsesTable.finishedAt),
          desc(countDistinct(scoresTable.id)),
          desc(responsesTable.id)
        )
        .groupBy(responsesTable.id, providerModelsTable.id)
        .$dynamic();
      let countQuery = tx
        .select({ count: countDistinct(responsesTable.id) })
        .from(responsesTable)
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [];

      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        query = query
          .leftJoin(
            promptSetPrompts,
            eq(promptSetPrompts.promptId, responsesTable.promptId)
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
            eq(responsesTable.promptId, promptSetPrompts.promptId)
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

      if (options?.filters?.promptId !== undefined) {
        whereConditions.push(
          eq(responsesTable.promptId, options.filters.promptId)
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

  static buildResponseQuickFeedbacksSubQuery(options: {
    tx: DbTx;
    subQueryName?: string;
  }) {
    return options.tx
      .$with(options.subQueryName || "sq_response_quick_feedbacks")
      .as(
        options.tx
          .select({
            id: quickFeedbacksTable.id,
            createdAt: quickFeedbacksTable.createdAt,
            responseId: quickFeedbacksTable.responseId,
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

export type GetPromptResponsesReturnItem = Awaited<
  ReturnType<typeof PromptResponseService.getPromptResponses>
>["data"][number];

export type GetPromptResponsesStatusReturnItem = Awaited<
  ReturnType<typeof PromptResponseService.getPromptResponsesStatuses>
>[number];
