import {
  promptSetsTable,
  promptsTable,
  promptSetPrompts,
  userRoleOnPromptSetTable,
  hashRegistrationsTable,
  DbPromptInsert,
  rawDataRegistrationsTable,
  DbRawDataRegistrationInsert,
  DbHashRegistrationInsert,
  DbPromptSetPromptInsert,
  scoresTable,
  responsesTable,
  quickFeedbacksTable,
  providerModelsTable,
  quickFeedbacksView,
  userStatsView,
  promptCommentsTable,
} from "@/database/schema";
import { db } from "../database/client";
import {
  calculateCID,
  calculateSHA256,
  NonRevealedPrompt,
  NonRevealedPromptSchema,
  Prompt,
  PromptSchema,
  removeDIDPrefix,
  stableStringify,
} from "peerbench";
import {
  and,
  count,
  eq,
  sql,
  desc,
  asc,
  inArray,
  isNotNull,
  or,
  ilike,
  gte,
  lte,
  SQL,
  ne,
  isNull,
  countDistinct,
  not,
  exists,
} from "drizzle-orm";
import { DbOptions, DbTx, PaginationOptions } from "@/types/db";
import { normalizeArray } from "@/utils/normalize-array";
import {
  dateDiff,
  excluded,
  exists1,
  intervalValue,
  jsonbAgg,
  jsonbBuildObject,
  withTxOrDb,
  withTxOrTx,
} from "@/database/helpers";
import { paginateQuery } from "@/database/query";
import {
  PromptStatuses,
  QuickFeedbackOpinions,
  SignatureKeyType,
  SignatureType,
  UserRoleOnPromptSet,
} from "@/database/types";
import { ADMIN_USER_ID, NULL_UUID } from "@/lib/constants";
import { z } from "zod";
import { promptFiltersSchema } from "@/validation/api/prompt-filters";
import { PromptAccessReason } from "@/types/prompt";
import { basePromptIdentifierSchema } from "@/validation/base-prompt-identifier";
import { PromptSetService } from "./promptset.service";
import { InferColumn } from "@/database/utilities";

export class PromptService {
  static async insertPrompts(
    data: {
      prompts: ((Prompt | NonRevealedPrompt) & {
        signature?: string;
        publicKey?: string;
        signatureType?: SignatureType;
        keyType?: SignatureKeyType;

        /**
         * Only presented for the non-revealed objects. Represents
         * the CID and SHA256 calculations of the stable stringified of
         * the full Prompt object.
         */
        hashCIDRegistration?: string;

        /**
         * Only presented for the non-revealed objects. Represents
         * the CID and SHA256 calculations of the stable stringified of
         * the full Prompt object.
         */
        hashSha256Registration?: string;
      })[];
      uploaderId: string;
      promptSetId: number;
    },
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrTx(async (tx) => {
      // Check ACL rules if the requested user is specified
      if (options?.requestedByUserId !== undefined) {
        await PromptSetService.checkUserPermissionOnPromptSet({
          tx,
          requestedByUserId: options.requestedByUserId,
          promptSetId: data.promptSetId,

          // Check if user is allowed to submit Prompts
          canSubmitPrompts: true,
        });
      }

      // Prepare the rows to be inserted
      const hashRegistrations: DbHashRegistrationInsert[] = [];
      const rawDataRegistrations: DbRawDataRegistrationInsert[] = [];
      const prompts: DbPromptInsert[] = [];
      const promptSetPromptsRows: DbPromptSetPromptInsert[] = [];

      for (const prompt of data.prompts) {
        // Use schema to filter additional fields
        const rawObject = z
          .union([PromptSchema, NonRevealedPromptSchema])
          .parse(prompt);
        const rawData = stableStringify(rawObject)!;

        // Use the provided hash calculations (for the non-revealed version) and
        // fallback to manual calculations from the raw data (for the full object version)
        const cid: string =
          prompt.hashCIDRegistration ??
          (await calculateCID(rawData).then((c) => c.toString()));
        const sha256 =
          prompt.hashSha256Registration ?? (await calculateSHA256(rawData));
        const isRevealed =
          prompt.prompt !== undefined && prompt.fullPrompt !== undefined;

        rawDataRegistrations.push({
          rawData: rawData,
          cid,
          sha256,
          publicKey: prompt.publicKey,
          uploaderId: data.uploaderId,
        });
        prompts.push({
          id: removeDIDPrefix(prompt.promptUUID),
          cid: prompt.promptCID,
          sha256: prompt.promptSHA256,
          question: prompt.prompt,

          fullPrompt: prompt.fullPrompt,
          fullPromptCID: prompt.fullPromptCID,
          fullPromptSHA256: prompt.fullPromptSHA256,

          options: prompt.options,
          answerKey: prompt.answerKey,
          answer: prompt.answer,
          type: prompt.type,
          metadata: prompt.metadata,

          isRevealed,
          uploaderId: data.uploaderId,

          scorers: prompt.scorers,
          hashCIDRegistration: cid,
          hashSha256Registration: sha256,
        });

        hashRegistrations.push({
          cid,
          sha256,
          signature: prompt.signature,
          publicKey: prompt.publicKey,
          signatureType: prompt.signatureType,
          keyType: prompt.keyType,
          uploaderId: data.uploaderId,
        });

        promptSetPromptsRows.push({
          promptId: removeDIDPrefix(prompt.promptUUID),
          promptSetId: data.promptSetId,
          status: PromptStatuses.included,
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

      // Insert Prompts
      const isPromptRevealed = and(
        // Given Prompt object has the revealed data
        isNotNull(excluded(promptsTable.question)),
        isNotNull(excluded(promptsTable.fullPrompt)),

        // Given Prompt object has the same hash calculations as reported before
        eq(
          promptsTable.hashCIDRegistration,
          excluded(promptsTable.hashCIDRegistration)
        ),
        eq(
          promptsTable.hashSha256Registration,
          excluded(promptsTable.hashSha256Registration)
        )
      );
      await tx
        .insert(promptsTable)
        .values(prompts)
        .onConflictDoUpdate({
          // Prompt is already registered, check if the caller is trying to reveal it
          target: [promptsTable.id],
          set: {
            // Only update the columns if the Prompt is revealed
            question: sql`
              CASE WHEN ${isPromptRevealed} THEN
                ${excluded(promptsTable.question)}
              ELSE
                ${promptsTable.question}
              END
            `,
            fullPrompt: sql`
              CASE WHEN ${isPromptRevealed} THEN
                ${excluded(promptsTable.fullPrompt)}
              ELSE
                ${promptsTable.fullPrompt}
              END
            `,
            isRevealed: sql`
              CASE WHEN ${isPromptRevealed} THEN
                TRUE
              ELSE
                ${promptsTable.isRevealed}
              END
            `,
          },
        });

      // Insert the relation between the Prompts and the Prompt Set
      await tx
        .insert(promptSetPrompts)
        .values(promptSetPromptsRows)
        .onConflictDoNothing(); // Prompts are already included in the Prompt Set

      // Update "updatedAt" of the Prompt Set
      await tx
        .update(promptSetsTable)
        .set({ updatedAt: sql`NOW()` })
        .where(eq(promptSetsTable.id, data.promptSetId));
    }, options?.tx);
  }

  /**
   * Retrieves the filters that can be used to search for prompts.
   */
  static async getPromptFilters(
    options?: DbOptions & { requestedByUserId?: string }
  ) {
    const tx = options?.tx ?? db;

    const combinedTags = sql<string[]>`
      jsonb_array_elements_text(
        COALESCE(${promptsTable.metadata}->'tags', '[]'::jsonb) ||
        COALESCE(${promptsTable.metadata}->'generatorTags', '[]'::jsonb) ||
        COALESCE(${promptsTable.metadata}->'articleTags', '[]'::jsonb) ||
        COALESCE(${promptsTable.metadata}->'sourceTags', '[]'::jsonb)
      )
    `.as("combined_tags");

    const promptsAggregation = tx.$with("prompts_aggregation").as(
      tx
        .select({
          combinedTags,
          promptTypes: promptsTable.type,
        })
        .from(promptsTable)
        .groupBy(combinedTags, promptsTable.type)
    );

    let query = tx
      .with(promptsAggregation)
      .select({
        tags: sql<string[]>`
          jsonb_agg(DISTINCT ${promptsAggregation.combinedTags})
        `,
        promptTypes: sql<string[]>`
          jsonb_agg(DISTINCT ${promptsAggregation.promptTypes})
        `,
        promptSets: sql<{ title: string; id: number }[]>`
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'title', ${promptSetsTable.title},
              'id', ${promptSetsTable.id}
            )
          ) FILTER (WHERE ${promptSetsTable.id} IS NOT NULL),
          '[]'::jsonb
        )
      `,
      })
      .from(promptsAggregation)
      .crossJoin(promptSetsTable)
      .$dynamic();
    const whereConditions: (SQL<unknown> | undefined)[] = [];

    if (
      options?.requestedByUserId !== undefined &&
      options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
    ) {
      query = query
        .leftJoin(
          userRoleOnPromptSetTable,
          and(
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
            eq(
              userRoleOnPromptSetTable.userId,
              options.requestedByUserId || NULL_UUID
            )
          )
        )
        .leftJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptSetId, promptSetsTable.id)
        );

      whereConditions.push(
        sql`
          CASE
            WHEN ${promptSetsTable.isPublic} THEN
              TRUE -- Public Prompt Sets can be seen 
            WHEN ${promptSetPrompts.status} = ${PromptStatuses.included} THEN
              ${
                // If Prompt is included by a Prompt Set see if the user has any of the following roles
                inArray(userRoleOnPromptSetTable.role, [
                  UserRoleOnPromptSet.admin,
                  UserRoleOnPromptSet.owner,
                  UserRoleOnPromptSet.collaborator,
                  UserRoleOnPromptSet.reviewer,
                ])
              }
            ELSE
              FALSE
          END
        `
      );
    }

    const [result] = await query.where(and(...whereConditions));

    return result;
  }

  static async getPrompts<IsRevealed extends boolean = false>(
    options: DbOptions &
      PaginationOptions & {
        /**
         * Caller user ID of the method. Will be used to apply access control rules if provided.
         */
        requestedByUserId?: string;
        accessReason?: PromptAccessReason;

        orderBy?: {
          createdAt?: "asc" | "desc";
          question?: "asc" | "desc";
          random?: "asc" | "desc";
          feedbackPriority?: "asc" | "desc";
        };
        filters?: z.infer<typeof promptFiltersSchema> & {
          isRevealed?: IsRevealed;
        };
      } = {}
  ) {
    return withTxOrDb(async (tx) => {
      const query = PromptService.buildGetPromptsQuery<IsRevealed>({
        tx,
        requestedByUserId: options.requestedByUserId,
        accessReason: options.accessReason,
        orderBy: options.orderBy,
        filters: options.filters,
      });

      return await paginateQuery(
        query,
        tx
          .select({
            count: countDistinct(promptsTable.id),
          })
          .from(query.as("query"))
          .$dynamic(),
        {
          page: options.page,
          pageSize: options.pageSize,
        }
      );
    }, options?.tx);
  }

  /**
   * Gets the Prompts in their raw format.
   */
  static async getPromptsAsFileStructured(
    options: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        accessReason?: PromptAccessReason;

        filters?: { promptSetId?: number | number[] };
      }
  ) {
    return withTxOrDb(async (tx) => {
      let query = tx
        .select({
          rawData: rawDataRegistrationsTable.rawData,
        })
        .from(rawDataRegistrationsTable)
        .innerJoin(
          promptsTable,
          and(
            eq(
              rawDataRegistrationsTable.sha256,
              promptsTable.hashSha256Registration
            ),
            eq(rawDataRegistrationsTable.cid, promptsTable.hashCIDRegistration)
          )
        )
        .$dynamic();

      let countQuery = tx
        .select({ count: count() })
        .from(rawDataRegistrationsTable)
        .innerJoin(
          promptsTable,
          and(
            eq(
              rawDataRegistrationsTable.sha256,
              promptsTable.hashSha256Registration
            ),
            eq(rawDataRegistrationsTable.cid, promptsTable.hashCIDRegistration)
          )
        )
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [];
      let joinPromptSetPrompts = false;
      let joinPromptSets = false;
      let userRoleJoinCondition: SQL<unknown> | undefined = undefined;

      // Apply access control rules
      if (
        options.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        // Join the user's roles on Prompt Sets
        userRoleJoinCondition = and(
          eq(
            userRoleOnPromptSetTable.promptSetId,
            promptSetPrompts.promptSetId
          ),
          eq(
            userRoleOnPromptSetTable.userId,

            // Check `PromptSetService.getPromptSets()` for more details about this usage
            options.requestedByUserId || NULL_UUID
          )
        );
        joinPromptSetPrompts = true;
        joinPromptSets = true;

        whereConditions.push(
          sql`
            CASE
              WHEN ${promptSetPrompts.status} = ${PromptStatuses.included} THEN
                CASE
                  WHEN ${promptSetsTable.isPublic} THEN
                    TRUE -- Prompts from public Prompt Sets can be seen by everyone
                  ELSE
                   ${
                     // If Prompt is included by a Prompt Set see if the user has any of the following roles
                     inArray(userRoleOnPromptSetTable.role, [
                       UserRoleOnPromptSet.admin,
                       UserRoleOnPromptSet.owner,
                       UserRoleOnPromptSet.collaborator,
                       UserRoleOnPromptSet.reviewer,
                     ])
                   }
                END
              ELSE
                ${
                  // Prompts that are excluded or have other statuses
                  inArray(userRoleOnPromptSetTable.role, [
                    UserRoleOnPromptSet.admin,
                    UserRoleOnPromptSet.owner,
                  ])
                }
            END
          `
        );

        // Apply extra filters based on the access reason
        switch (
          options.accessReason
          // TODO: No access reason filters available for Prompt entity
        ) {
        }
      }

      if (options.filters?.promptSetId !== undefined) {
        const ids = normalizeArray(options.filters.promptSetId);
        if (ids.length > 0) {
          joinPromptSetPrompts = true;
          whereConditions.push(inArray(promptSetPrompts.promptSetId, ids));
        }
      }

      // Join additional table if needed
      if (joinPromptSetPrompts) {
        query = query.leftJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptId, promptsTable.id)
        );
        countQuery = countQuery.leftJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptId, promptsTable.id)
        );
      }

      if (joinPromptSets) {
        query = query.leftJoin(
          promptSetsTable,
          eq(promptSetsTable.id, promptSetPrompts.promptSetId)
        );
        countQuery = countQuery.leftJoin(
          promptSetsTable,
          eq(promptSetsTable.id, promptSetPrompts.promptSetId)
        );
      }

      if (userRoleJoinCondition) {
        query = query.leftJoin(userRoleOnPromptSetTable, userRoleJoinCondition);
        countQuery = countQuery.leftJoin(
          userRoleOnPromptSetTable,
          userRoleJoinCondition
        );
      }

      return await paginateQuery(
        query.where(and(...whereConditions)),
        countQuery.where(and(...whereConditions)),
        {
          page: options.page,
          pageSize: options.pageSize,
          convertData: (data) => data.map((item) => item.rawData),
        }
      );
    });
  }

  static async getPromptsStatuses(
    options: DbOptions & {
      prompts: z.infer<typeof basePromptIdentifierSchema>[];
    }
  ) {
    return withTxOrDb(async (tx) => {
      const query = tx
        .select({
          promptId: promptsTable.id,
          isRevealed: promptsTable.isRevealed,
          hashSha256Registration: promptsTable.hashSha256Registration,
          hashCIDRegistration: promptsTable.hashCIDRegistration,
        })
        .from(promptsTable)
        .where(
          or(
            ...options.prompts.map((prompt) =>
              and(
                eq(promptsTable.id, prompt.id),
                eq(
                  promptsTable.hashSha256Registration,
                  prompt.hashSha256Registration
                ),
                eq(promptsTable.hashCIDRegistration, prompt.hashCIDRegistration)
              )
            )
          )
        )
        .$dynamic();

      const queryResult = await query;
      const foundPrompts = [];

      for (const prompt of options.prompts) {
        // Check if the given Prompt is found in the query result
        const foundPrompt = queryResult.find(
          (p) =>
            p.promptId === prompt.id &&
            p.hashSha256Registration === prompt.hashSha256Registration &&
            p.hashCIDRegistration === prompt.hashCIDRegistration
        );

        if (foundPrompt) {
          foundPrompts.push({
            id: foundPrompt.promptId,
            isRevealed: foundPrompt.isRevealed,
            isRegistered: true as const,
          });
        } else {
          foundPrompts.push({
            isRegistered: false as const,
          });
        }
      }

      return foundPrompts;
    }, options?.tx);
  }

  // Query Builders

  /**
   * Subquery for Prompt stats per model.
   */
  static buildResponseAndScoreStatsSubQuery(
    options: DbOptions<true> & {
      goodScoreThreshold?: number;
      badScoreThreshold?: number;
      subQueryName?: string;
    }
  ) {
    const goodScoreThreshold =
      options.goodScoreThreshold?.toFixed?.(2) || "0.5";
    const badScoreThreshold = options.badScoreThreshold?.toFixed?.(2) || "0";

    return options.tx
      .$with(options.subQueryName || "sq_prompt_response_and_score_stats")
      .as(
        options.tx
          .select({
            promptId: responsesTable.promptId,
            modelId: sql<string>`${providerModelsTable.modelId}`.as("model_id"),
            scoreCount: count(scoresTable.id).as("score_count"),
            firstResponseCreatedAt: sql<Date>`MIN(${responsesTable.createdAt})`
              .mapWith((v) => new Date(v))
              .as("first_response_created_at"),
            goodScoreCount: sql<number>`
              COUNT(*) FILTER (WHERE ${scoresTable.score} >= ${goodScoreThreshold})
            `
              .mapWith(Number)
              .as("good_score_count"),
            badScoreCount: sql<number>`
              COUNT(*) FILTER (WHERE ${scoresTable.score} <= ${badScoreThreshold})
            `
              .mapWith(Number)
              .as("bad_score_count"),
            avgScore: sql<number>`AVG(${scoresTable.score})`
              .mapWith(Number)
              .as("avg_score"),
            totalScore: sql<number>`SUM(${scoresTable.score})`
              .mapWith(Number)
              .as("total_score"),
          })
          .from(responsesTable)
          .leftJoin(scoresTable, eq(responsesTable.id, scoresTable.responseId))
          .leftJoin(
            providerModelsTable,
            eq(responsesTable.modelId, providerModelsTable.id)
          )
          .groupBy(responsesTable.promptId, providerModelsTable.modelId)
      );
  }

  static buildIncludedInPromptSetsSubQuery(options: {
    tx: DbTx;
    subQueryName?: string;
    requestedByUserId?: string;
  }) {
    let query = options.tx
      .select({
        promptId: promptSetPrompts.promptId,
        promptSetId: promptSetPrompts.promptSetId,
        title: promptSetsTable.title,
        promptStatus: promptSetPrompts.status,
        canExclude: (options?.requestedByUserId !== undefined
          ? sql<boolean>`${and(
              ne(promptSetPrompts.status, PromptStatuses.excluded),

              options.requestedByUserId === ADMIN_USER_ID // ACL rules doesn't apply to admin user
                ? sql.raw("true")
                : inArray(userRoleOnPromptSetTable.role, [
                    UserRoleOnPromptSet.admin,
                    UserRoleOnPromptSet.owner,
                  ])
            )}`
          : sql<boolean>`false`
        ).as("can_exclude"),
        canReInclude: (options?.requestedByUserId !== undefined
          ? sql<boolean>`${and(
              eq(promptSetPrompts.status, PromptStatuses.excluded),
              options.requestedByUserId === ADMIN_USER_ID // ACL rules doesn't apply to admin user
                ? sql.raw("true")
                : inArray(userRoleOnPromptSetTable.role, [
                    UserRoleOnPromptSet.admin,
                    UserRoleOnPromptSet.owner,
                  ])
            )}`
          : sql<boolean>`false`
        ).as("can_re_include"),
      })
      .from(promptSetPrompts)
      .innerJoin(
        promptSetsTable,
        eq(promptSetPrompts.promptSetId, promptSetsTable.id)
      )
      .$dynamic();
    const whereConditions: (SQL<unknown> | undefined)[] = [];

    if (
      options.requestedByUserId !== undefined &&
      options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
    ) {
      query = query.leftJoin(
        userRoleOnPromptSetTable,
        and(
          eq(
            userRoleOnPromptSetTable.promptSetId,
            promptSetPrompts.promptSetId
          ),
          eq(
            userRoleOnPromptSetTable.userId,
            options.requestedByUserId || NULL_UUID
          )
        )
      );

      // If one of the conditions is true, that means we can return information about
      // "the Prompt is included in XXX Prompt Set". Otherwise user doesn't have enough
      // permissions so we shouldn't.
      whereConditions.push(
        sql`
          CASE
            WHEN ${promptSetsTable.isPublic} THEN
              TRUE -- Prompts from public Prompt Sets can be seen by everyone
            WHEN ${promptSetPrompts.status} = ${PromptStatuses.included} THEN
              ${
                // If Prompt is included by a Prompt Set see if the user has any of the following roles
                inArray(userRoleOnPromptSetTable.role, [
                  UserRoleOnPromptSet.admin,
                  UserRoleOnPromptSet.owner,
                  UserRoleOnPromptSet.collaborator,
                  UserRoleOnPromptSet.reviewer,
                ])
              }
            ELSE
              ${
                // Prompts that are excluded or have other statuses only can be visible by Admins and the Owner
                inArray(userRoleOnPromptSetTable.role, [
                  UserRoleOnPromptSet.admin,
                  UserRoleOnPromptSet.owner,
                ])
              }
          END
        `
      );
    }

    return options.tx
      .$with(options.subQueryName || "sq_included_in_prompt_sets")
      .as(query.where(and(...whereConditions)));
  }

  static buildGetPromptsQuery<IsRevealed extends boolean = false>(
    options: DbOptions<true> & {
      /**
       * Caller user ID of the method. Will be used to apply access control rules if provided.
       */
      requestedByUserId?: string;
      accessReason?: PromptAccessReason;
      filters?: z.infer<typeof promptFiltersSchema> & {
        isRevealed?: IsRevealed;
      };
      orderBy?: {
        createdAt?: "asc" | "desc";
        question?: "asc" | "desc";
        random?: "asc" | "desc";
        feedbackPriority?: "asc" | "desc";
      };
    }
  ) {
    // Subqueries
    const includedInPromptSetsSubQuery =
      PromptService.buildIncludedInPromptSetsSubQuery({
        tx: options.tx,
        requestedByUserId: options.requestedByUserId,
      });

    const responseAndScoreStatsSubQuery =
      PromptService.buildResponseAndScoreStatsSubQuery({
        tx: options.tx,
        goodScoreThreshold: options.filters?.goodScoreThreshold,
        badScoreThreshold: options.filters?.badScoreThreshold,
      });

    // Aggregations
    const quickFeedbackCount = sql<number>`
      COUNT(DISTINCT ${quickFeedbacksView.id})
    `.mapWith(Number);
    const positiveQuickFeedbackCount = sql<number>`
      COUNT(DISTINCT ${quickFeedbacksView.id})
      FILTER (WHERE ${eq(quickFeedbacksView.opinion, QuickFeedbackOpinions.positive)})
    `.mapWith(Number);
    const negativeQuickFeedbackCount = sql<number>`
      COUNT(DISTINCT ${quickFeedbacksView.id})
      FILTER (WHERE ${eq(quickFeedbacksView.opinion, QuickFeedbackOpinions.negative)})
    `.mapWith(Number);

    /*
     * We need to use aggregation although we don't have to because we know that there will
     * be only one row for user's feedback on a single Prompt. But because of we are doing aggregation
     * from the sub query columns, SQL doesn't allow use to also pick one single row
     * from those aggregated rows.
     * TODO: There must be better way to do that without json agg - mdk
     */
    const userQuickFeedback = jsonbAgg(
      jsonbBuildObject({
        id: quickFeedbacksView.id,
        opinion: quickFeedbacksView.opinion,
        createdAt: quickFeedbacksView.createdAt,
        flags: quickFeedbacksView.flags,
      }),
      {
        distinct: true,
        filterWhere: eq(
          quickFeedbacksView.userId,
          options.requestedByUserId || NULL_UUID
        ),
        nthItem: 0,
      }
    );

    const responseAndScoreStats = jsonbAgg(
      jsonbBuildObject({
        modelId: responseAndScoreStatsSubQuery.modelId,
        scoreCount: responseAndScoreStatsSubQuery.scoreCount,
        totalScore: responseAndScoreStatsSubQuery.totalScore,
        avgScore: responseAndScoreStatsSubQuery.avgScore,
      }),
      {
        distinct: true,
        filterWhere: isNotNull(responseAndScoreStatsSubQuery.modelId),
        fallbackEmptyArray: true,
      }
    );

    const includedInPromptSets = jsonbAgg(
      jsonbBuildObject({
        id: includedInPromptSetsSubQuery.promptSetId,
        title: includedInPromptSetsSubQuery.title,
        promptStatus: includedInPromptSetsSubQuery.promptStatus,
        canExclude: includedInPromptSetsSubQuery.canExclude,
        canReInclude: includedInPromptSetsSubQuery.canReInclude,
      }),
      {
        distinct: true,
        filterWhere: isNotNull(promptSetsTable.id),
        fallbackEmptyArray: true,
      }
    );

    let query = options.tx
      .with(includedInPromptSetsSubQuery, responseAndScoreStatsSubQuery)
      .select({
        id: promptsTable.id,
        type: promptsTable.type,

        question: sql<
          InferColumn<typeof promptsTable.question, IsRevealed>
        >`${promptsTable.question}`,
        cid: promptsTable.cid,
        sha256: promptsTable.sha256,

        options: sql<
          InferColumn<typeof promptsTable.options, IsRevealed>
        >`${promptsTable.options}`,
        answerKey: sql<
          InferColumn<typeof promptsTable.answerKey, IsRevealed>
        >`${promptsTable.answerKey}`,
        answer: sql<
          InferColumn<typeof promptsTable.answer, IsRevealed>
        >`${promptsTable.answer}`,

        fullPrompt: sql<
          InferColumn<typeof promptsTable.fullPrompt, IsRevealed>
        >`${promptsTable.fullPrompt}`,
        fullPromptCID: promptsTable.fullPromptCID,
        fullPromptSHA256: promptsTable.fullPromptSHA256,

        metadata: promptsTable.metadata,
        createdAt: promptsTable.createdAt,
        isRevealed: promptsTable.isRevealed,
        scorers: promptsTable.scorers,

        includedInPromptSets,

        quickFeedbackCount,
        positiveQuickFeedbackCount,
        negativeQuickFeedbackCount,

        responseAndScoreStats,
        last48HCommentCount: countDistinct(promptCommentsTable.id),

        userQuickFeedback,
      })
      .from(promptsTable)
      .leftJoin(
        promptSetPrompts,
        eq(promptsTable.id, promptSetPrompts.promptId)
      )
      .leftJoin(
        promptSetsTable,
        eq(promptSetPrompts.promptSetId, promptSetsTable.id)
      )
      .leftJoin(
        includedInPromptSetsSubQuery,
        eq(promptsTable.id, includedInPromptSetsSubQuery.promptId)
      )
      .leftJoin(
        responseAndScoreStatsSubQuery,
        eq(promptsTable.id, responseAndScoreStatsSubQuery.promptId)
      )
      .leftJoin(
        quickFeedbacksView,
        eq(promptsTable.id, quickFeedbacksView.promptId)
      )
      .leftJoin(
        promptCommentsTable,
        and(
          eq(promptsTable.id, promptCommentsTable.promptId),
          gte(
            promptCommentsTable.createdAt,
            sql`NOW() - ${intervalValue({ hours: 48 })}`
          )
        )
      )
      .groupBy(promptsTable.id)
      .$dynamic();
    const havingConditions: SQL<unknown>[] = [];
    const whereConditions: (SQL<unknown> | undefined)[] = [
      isNull(promptSetsTable.deletedAt), // Exclude deleted Prompt Sets
    ];

    // Apply access control rules
    if (
      options.requestedByUserId !== undefined &&
      options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
    ) {
      // Join the user's roles on Prompt Sets
      query = query.leftJoin(
        userRoleOnPromptSetTable,
        and(
          eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
          eq(
            userRoleOnPromptSetTable.userId,

            // Check `PromptSetService.getPromptSets()` for more details about this usage
            options.requestedByUserId || NULL_UUID
          )
        )
      );

      whereConditions.push(
        sql`
        CASE
          WHEN ${promptSetPrompts.status} = ${PromptStatuses.included} THEN
            CASE
              WHEN ${
                // Prompts from public Prompt Sets can be seen by everyone
                promptSetsTable.isPublic
              } THEN
                TRUE 
              ELSE
               ${
                 // If Prompt is included by a Prompt Set, check if the user has one of the following roles for that Prompt Set
                 inArray(userRoleOnPromptSetTable.role, [
                   UserRoleOnPromptSet.admin,
                   UserRoleOnPromptSet.owner,
                   UserRoleOnPromptSet.collaborator,
                   UserRoleOnPromptSet.reviewer,
                 ])
               }
            END
          ELSE
            ${
              // Prompts that are excluded or have other statuses
              inArray(userRoleOnPromptSetTable.role, [
                UserRoleOnPromptSet.admin,
                UserRoleOnPromptSet.owner,
              ])
            }
        END
      `
      );

      // Apply extra filters based on the access reason
      switch (
        options.accessReason
        // TODO: No access reason filters available for Prompt entity
      ) {
      }
    }

    if (options.filters?.id && options.filters.id.length > 0) {
      whereConditions.push(inArray(promptsTable.id, options.filters.id));
    }

    if (
      options.filters?.promptSetId &&
      options.filters.promptSetId.length > 0
    ) {
      whereConditions.push(
        inArray(promptSetsTable.id, options.filters.promptSetId)
      );
    }

    if (options.filters?.status && options.filters.status.length > 0) {
      whereConditions.push(
        inArray(promptSetPrompts.status, options.filters.status)
      );
    }

    if (options.filters?.uploaderId !== undefined) {
      // TODO: Properly use `uploaderId` column on promptsTable instead of joining
      query = query.leftJoin(
        hashRegistrationsTable,
        and(
          eq(
            promptsTable.hashSha256Registration,
            hashRegistrationsTable.sha256
          ),
          eq(promptsTable.hashCIDRegistration, hashRegistrationsTable.cid)
        )
      );
      whereConditions.push(
        eq(hashRegistrationsTable.uploaderId, options.filters.uploaderId)
      );
    }

    if (options.filters?.type && options.filters.type.length > 0) {
      whereConditions.push(inArray(promptsTable.type, options.filters.type));
    }

    // Filter by model slugs - show only prompts that have scores from ALL of these models (AND logic)
    if (options.filters?.modelSlugs) {
      const slugs = options.filters.modelSlugs
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (slugs.length > 0) {
        // For each model slug, check if the prompt has a score from that model (AND logic)
        const modelConditions = slugs.map(
          (slug) => sql`
            EXISTS (
              SELECT 1 FROM ${scoresTable}
              INNER JOIN ${responsesTable} ON ${responsesTable.id} = ${scoresTable.responseId}
              INNER JOIN ${providerModelsTable} ON ${providerModelsTable.id} = ${responsesTable.modelId}
              WHERE ${scoresTable.promptId} = ${promptsTable.id}
              AND ${providerModelsTable.modelId} = ${slug}
            )
          `
        );

        // Join all conditions with AND - prompt must have scores from ALL specified models
        whereConditions.push(sql`(${sql.join(modelConditions, sql` AND `)})`);
      }
    }

    if (options?.filters?.reviewedByUserId !== undefined) {
      whereConditions.push(
        exists1({
          from: quickFeedbacksTable,
          where: and(
            eq(quickFeedbacksTable.promptId, promptsTable.id),
            eq(quickFeedbacksTable.userId, options.filters.reviewedByUserId)
          ),
        })
      );
    }

    // Filter out the Prompts that have not been reviewed by the given user
    if (options.filters?.excludeReviewedByUserId !== undefined) {
      whereConditions.push(
        not(
          exists1({
            from: quickFeedbacksTable,
            where: and(
              eq(quickFeedbacksTable.promptId, promptsTable.id),
              eq(
                quickFeedbacksTable.userId,
                options.filters?.excludeReviewedByUserId
              )
            ),
          })
        )
      );
    }

    if (
      options.filters?.notScoredByModelSlug &&
      options.filters.notScoredByModelSlug.length > 0
    ) {
      whereConditions.push(
        not(
          exists(
            options.tx
              .select()
              .from(responsesTable)
              .innerJoin(
                scoresTable,
                eq(scoresTable.responseId, responsesTable.id)
              )
              .innerJoin(
                providerModelsTable,
                eq(providerModelsTable.id, responsesTable.modelId)
              )
              .where(
                and(
                  eq(scoresTable.promptId, promptsTable.id),
                  inArray(
                    providerModelsTable.modelId,
                    options.filters.notScoredByModelSlug
                  )
                )
              )
          )
        )
      );
    }

    let searchCondition;
    if (options.filters?.search) {
      searchCondition = ilike(
        promptsTable.fullPrompt,
        `%${options.filters.search}%`
      );
    }

    let searchIdCondition;
    if (options.filters?.searchId) {
      searchIdCondition = inArray(
        sql`${promptsTable.id}::text`,
        normalizeArray(options.filters.searchId)
      );
    }

    // If both search filter are given, that means they have to be OR'ed
    // (search by ID or content of the Prompt)
    if (searchCondition && searchIdCondition) {
      whereConditions.push(or(searchCondition, searchIdCondition));
    } else if (searchCondition) {
      // Otherwise use them as they are
      whereConditions.push(searchCondition);
    } else if (searchIdCondition) {
      whereConditions.push(searchIdCondition);
    }

    if (options.filters?.tags && options.filters.tags.length > 0) {
      const tagConditions = options.filters.tags
        .map((tag) => [
          sql`${promptsTable.metadata}->'tags' @> ${JSON.stringify([tag])}`,
          sql`${promptsTable.metadata}->'generatorTags' @> ${JSON.stringify([tag])}`,
          sql`${promptsTable.metadata}->'articleTags' @> ${JSON.stringify([tag])}`,
          sql`${promptsTable.metadata}->'sourceTags' @> ${JSON.stringify([tag])}`,
        ])
        .flat();
      whereConditions.push(or(...tagConditions));
    }

    if (options.filters?.minAvgScore !== undefined) {
      whereConditions.push(
        exists1({
          from: responseAndScoreStatsSubQuery,
          where: and(
            eq(responseAndScoreStatsSubQuery.promptId, promptsTable.id),
            gte(
              responseAndScoreStatsSubQuery.avgScore,
              options.filters.minAvgScore
            )
          ),
        })
      );
    }

    if (options.filters?.maxAvgScore !== undefined) {
      whereConditions.push(
        exists1({
          from: responseAndScoreStatsSubQuery,
          where: and(
            eq(responseAndScoreStatsSubQuery.promptId, promptsTable.id),
            lte(
              responseAndScoreStatsSubQuery.avgScore,
              options.filters.maxAvgScore
            )
          ),
        })
      );
    }

    if (options.filters?.minScoreCount !== undefined) {
      whereConditions.push(
        exists1({
          from: responseAndScoreStatsSubQuery,
          where: and(
            eq(responseAndScoreStatsSubQuery.promptId, promptsTable.id),
            gte(
              responseAndScoreStatsSubQuery.scoreCount,
              options.filters.minScoreCount
            )
          ),
        })
      );
    }

    if (options.filters?.maxScoreCount !== undefined) {
      whereConditions.push(
        exists1({
          from: responseAndScoreStatsSubQuery,
          where: and(
            eq(responseAndScoreStatsSubQuery.promptId, promptsTable.id),
            lte(
              responseAndScoreStatsSubQuery.scoreCount,
              options.filters.maxScoreCount
            )
          ),
        })
      );
    }

    if (options.filters?.minBadScoreCount !== undefined) {
      whereConditions.push(
        exists1({
          from: responseAndScoreStatsSubQuery,
          where: and(
            eq(responseAndScoreStatsSubQuery.promptId, promptsTable.id),
            gte(
              responseAndScoreStatsSubQuery.badScoreCount,
              options.filters.minBadScoreCount
            )
          ),
        })
      );
    }

    if (options.filters?.maxBadScoreCount !== undefined) {
      whereConditions.push(
        exists1({
          from: responseAndScoreStatsSubQuery,
          where: and(
            eq(responseAndScoreStatsSubQuery.promptId, promptsTable.id),
            lte(
              responseAndScoreStatsSubQuery.badScoreCount,
              options.filters.maxBadScoreCount
            )
          ),
        })
      );
    }

    if (options.filters?.minGoodScoreCount !== undefined) {
      whereConditions.push(
        exists1({
          from: responseAndScoreStatsSubQuery,
          where: and(
            eq(responseAndScoreStatsSubQuery.promptId, promptsTable.id),
            gte(
              responseAndScoreStatsSubQuery.goodScoreCount,
              options.filters.minGoodScoreCount
            )
          ),
        })
      );
    }

    if (options.filters?.maxGoodScoreCount !== undefined) {
      whereConditions.push(
        exists1({
          from: responseAndScoreStatsSubQuery,
          where: and(
            eq(responseAndScoreStatsSubQuery.promptId, promptsTable.id),
            lte(
              responseAndScoreStatsSubQuery.goodScoreCount,
              options.filters.maxGoodScoreCount
            )
          ),
        })
      );
    }

    if (options.filters?.minReviewsCount !== undefined) {
      havingConditions.push(
        gte(quickFeedbackCount, options.filters.minReviewsCount)
      );
    }

    if (options.filters?.maxReviewsCount !== undefined) {
      havingConditions.push(
        lte(quickFeedbackCount, options.filters.maxReviewsCount)
      );
    }

    if (options.filters?.minPositiveReviewsCount !== undefined) {
      havingConditions.push(
        gte(positiveQuickFeedbackCount, options.filters.minPositiveReviewsCount)
      );
    }

    if (options.filters?.maxPositiveReviewsCount !== undefined) {
      havingConditions.push(
        lte(positiveQuickFeedbackCount, options.filters.maxPositiveReviewsCount)
      );
    }

    if (options.filters?.minNegativeReviewsCount !== undefined) {
      havingConditions.push(
        gte(negativeQuickFeedbackCount, options.filters.minNegativeReviewsCount)
      );
    }

    if (options.filters?.maxNegativeReviewsCount !== undefined) {
      havingConditions.push(
        lte(negativeQuickFeedbackCount, options.filters.maxNegativeReviewsCount)
      );
    }

    if (options.filters?.maxPromptAgeDays !== undefined) {
      whereConditions.push(
        lte(
          promptsTable.createdAt,
          sql`NOW() + ${intervalValue({ days: options.filters.maxPromptAgeDays })}`
        )
      );
    }

    if (options.filters?.maxGapToFirstResponse !== undefined) {
      whereConditions.push(
        exists1({
          from: responseAndScoreStatsSubQuery,
          where: and(
            eq(responseAndScoreStatsSubQuery.promptId, promptsTable.id),
            lte(
              dateDiff(
                responseAndScoreStatsSubQuery.firstResponseCreatedAt,
                promptsTable.createdAt
              ),
              intervalValue({
                seconds: options.filters.maxGapToFirstResponse,
              })
            )
          ),
        })
      );
    }

    if (options.filters?.isRevealed !== undefined) {
      whereConditions.push(
        eq(promptsTable.isRevealed, options.filters.isRevealed)
      );
    }

    // Apply sorting
    const orderColumns = [];
    if (options.orderBy && Object.keys(options.orderBy).length > 0) {
      const orderDirections = { asc: asc, desc: desc };

      if (options.orderBy.createdAt) {
        // Some of the prompts have the same createdAt,
        // so we need to sort by id as well
        orderColumns.push(
          orderDirections[options.orderBy.createdAt](promptsTable.createdAt),
          desc(promptsTable.id)
        );
      }

      if (options.orderBy.question) {
        orderColumns.push(
          orderDirections[options.orderBy.question](promptsTable.question),
          desc(promptsTable.id)
        );
      }

      if (options.orderBy.feedbackPriority) {
        // Order by feedback count priority: 2, then 1, then 0, then 3+
        // Then randomize within each bucket
        orderColumns.push(
          sql`
            CASE
              WHEN ${quickFeedbackCount} = 2 THEN 1
              WHEN ${quickFeedbackCount} = 1 THEN 2
              WHEN ${quickFeedbackCount} = 0 THEN 3
            ELSE 4
            END
          `,
          sql`RANDOM()`
        );
      }

      if (options.orderBy.random) {
        orderColumns.push(sql`RANDOM()`);
      }
    } else {
      orderColumns.push(desc(promptsTable.createdAt), desc(promptsTable.id));
    }

    return query
      .where(and(...whereConditions))
      .having(and(...havingConditions))
      .orderBy(...orderColumns);
  }

  /**
   * Check if a prompt exists by its hash (CID or SHA256) and optionally check
   * if it's assigned to a specific benchmark. Applies ACL rules to ensure
   * the user has access to see the prompt.
   */
  static async checkPromptByHash(
    data: {
      fullPromptCID: string;
      fullPromptSHA256: string;
      promptSetId?: number;
      requestedByUserId?: string;
    },
    options?: DbOptions
  ) {
    return withTxOrDb(async (tx) => {
      // Check if prompt exists by content hash (CID or SHA256 of full prompt)
      const promptResults = await tx
        .select({
          id: promptsTable.id,
        })
        .from(promptsTable)
        .where(
          or(
            eq(promptsTable.fullPromptCID, data.fullPromptCID),
            eq(promptsTable.fullPromptSHA256, data.fullPromptSHA256)
          )
        );

      const promptExists = promptResults.length > 0;

      if (!promptExists) {
        // If the prompt does not exist, return false and null promptId, no need for further checks
        return {
          exists: false,
          promptId: null,
          isAssignedToBenchmark: data.promptSetId !== undefined ? false : null,
        };
      }

      const existingPromptIds = promptResults.map((p) => p.id);

      if (
        data.requestedByUserId !== undefined &&
        data.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        // If a user is specified, apply ACL rules

        // Check if the prompt is in any promptset that the user has access to
        // (either public promptsets or promptsets where the user has a role)

        const accessiblePromptSets = await tx
          .select({
            promptSetId: promptSetPrompts.promptSetId,
            promptId: promptSetPrompts.promptId,
            isPublic: promptSetsTable.isPublic,
            userRole: userRoleOnPromptSetTable.role,
          })
          .from(promptSetPrompts)
          .innerJoin(
            promptSetsTable,
            eq(promptSetPrompts.promptSetId, promptSetsTable.id)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            and(
              eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
              eq(userRoleOnPromptSetTable.userId, data.requestedByUserId)
            )
          )
          .where(
            and(
              inArray(promptSetPrompts.promptId, existingPromptIds),
              isNull(promptSetsTable.deletedAt),
              or(
                // Public promptsets are accessible to everyone
                eq(promptSetsTable.isPublic, true),
                // Or user has any role on the promptset
                isNotNull(userRoleOnPromptSetTable.role)
              )
            )
          );

        // Check if prompt is assigned to the specific benchmark (if promptSetId provided)
        let promptId = null;
        if (data.promptSetId !== undefined && accessiblePromptSets.length > 0) {
          promptId =
            accessiblePromptSets.find(
              (ps) => ps.promptSetId === data.promptSetId
            )?.promptId || null;
        }

        return {
          exists: accessiblePromptSets.length > 0 ? true : false,
          promptId:
            accessiblePromptSets.length > 0
              ? accessiblePromptSets[0]?.promptId
              : null,
          isAssignedToBenchmark:
            data.promptSetId !== undefined ? promptId !== null : null,
        };
      } else {
        // If no user is specified, return the first promptId or the one that is assigned to the requested benchmark
        if (data.promptSetId !== undefined) {
          const promptSetsWithPrompts = await tx
            .select({
              promptSetId: promptSetPrompts.promptSetId,
            })
            .from(promptSetPrompts)
            .where(
              and(
                inArray(promptSetPrompts.promptId, existingPromptIds),
                eq(promptSetPrompts.promptSetId, data.promptSetId)
              )
            );

          const isAssigned = promptSetsWithPrompts.length > 0;

          return {
            exists: true,
            promptId: isAssigned ? existingPromptIds[0] : null,
            isAssignedToBenchmark:
              data.promptSetId !== undefined ? isAssigned : null,
          };
        } else {
          return {
            exists: true,
            promptId: existingPromptIds[0],
            isAssignedToBenchmark: null,
          };
        }
      }
    }, options?.tx);
  }

  /**
   * Get curated leaderboard based on prompt filters
   * Similar to getPrompts but aggregates by model instead of returning prompts
   */
  static async getCuratedLeaderboard(
    options: DbOptions & {
      requestedByUserId?: string;
      accessReason?: PromptAccessReason;
      minCoverage?: number;
      promptAgeWeighting?: "none" | "linear" | "exponential";
      responseDelayWeighting?: "none" | "linear" | "exponential";
      revealedResponses?: boolean;
      filters?: z.infer<typeof promptFiltersSchema>;
    } = {}
  ) {
    return withTxOrDb(async (tx) => {
      const promptsSubQuery = PromptService.buildGetPromptsQuery({
        tx,
        requestedByUserId: options.requestedByUserId,
        accessReason: options.accessReason,
        filters: options.filters,
      }).as("sq_prompts");

      // Calculate overall statistics for the filtered prompts
      const stats = await tx
        .with(promptsSubQuery)
        .select({
          totalDistinctPrompts:
            sql<number>`COUNT(DISTINCT ${promptsSubQuery.id})`.mapWith(Number),
          totalResponses:
            sql<number>`COUNT(DISTINCT ${responsesTable.id})`.mapWith(Number),
          totalScores: sql<number>`COUNT(${scoresTable.id})`.mapWith(Number),
        })
        .from(promptsSubQuery)
        .leftJoin(scoresTable, eq(scoresTable.promptId, promptsSubQuery.id))
        .leftJoin(responsesTable, eq(responsesTable.id, scoresTable.responseId))
        .then((result) => result[0]);

      // Calculate distribution of prompts by prompt set
      const promptSetDistribution = await tx
        .with(promptsSubQuery)
        .select({
          promptSetId: promptSetPrompts.promptSetId,
          promptSetTitle: promptSetsTable.title,
          promptCount:
            sql<number>`COUNT(DISTINCT ${promptsSubQuery.id})`.mapWith(Number),
        })
        .from(promptsSubQuery)
        .innerJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptId, promptsSubQuery.id)
        )
        .innerJoin(
          promptSetsTable,
          eq(promptSetsTable.id, promptSetPrompts.promptSetId)
        )
        .groupBy(promptSetPrompts.promptSetId, promptSetsTable.title)
        .orderBy(desc(sql`COUNT(DISTINCT ${promptsSubQuery.id})`));

      // Build weighted score calculation based on options
      let weightedScoreSql = sql<number>`${scoresTable.score}`;

      // Apply prompt age weighting if specified
      if (options.promptAgeWeighting && options.promptAgeWeighting !== "none") {
        const ageWeightFormula =
          options.promptAgeWeighting === "linear"
            ? sql`GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - ${promptsTable.createdAt})) / (86400.0 * 365)))`
            : sql`EXP(-EXTRACT(EPOCH FROM (NOW() - ${promptsTable.createdAt})) / (86400.0 * 180))`; // exponential decay with 180-day half-life

        weightedScoreSql = sql<number>`${scoresTable.score} * ${ageWeightFormula}`;
      }

      // Apply response delay weighting if specified
      if (
        options.responseDelayWeighting &&
        options.responseDelayWeighting !== "none"
      ) {
        const delayWeightFormula =
          options.responseDelayWeighting === "linear"
            ? sql`GREATEST(0, 1 - (EXTRACT(EPOCH FROM (${responsesTable.createdAt} - ${promptsTable.createdAt})) / (86400.0 * 365)))`
            : sql`EXP(-EXTRACT(EPOCH FROM (${responsesTable.createdAt} - ${promptsTable.createdAt})) / (86400.0 * 180))`; // exponential decay

        weightedScoreSql = sql<number>`${weightedScoreSql} * ${delayWeightFormula}`;
      }

      // Now compute leaderboard data from the filtered prompts
      const leaderboardData = await tx
        .with(promptsSubQuery)
        .select({
          modelProvider: sql<string>`MIN(${providerModelsTable.provider})`.as(
            "model_provider"
          ),
          modelName: sql<string>`MIN(${providerModelsTable.modelId})`.as(
            "model_name"
          ),
          modelId: providerModelsTable.id,
          avgScore: sql<number>`AVG(${weightedScoreSql})`.mapWith(Number),
          totalScores: sql<number>`COUNT(${scoresTable.id})`.mapWith(Number),
          uniquePrompts:
            sql<number>`COUNT(DISTINCT ${scoresTable.promptId})`.mapWith(
              Number
            ),
          avgResponseTime: sql<number>`AVG(
              EXTRACT(EPOCH FROM (${responsesTable.finishedAt} - ${responsesTable.startedAt}))
            ) FILTER (WHERE EXTRACT(EPOCH FROM (${responsesTable.finishedAt} - ${responsesTable.startedAt})) > 0)`.mapWith(
            Number
          ),
        })
        .from(promptsSubQuery)
        .innerJoin(scoresTable, eq(scoresTable.promptId, promptsSubQuery.id))
        .innerJoin(
          responsesTable,
          eq(responsesTable.id, scoresTable.responseId)
        )
        .innerJoin(promptsTable, eq(promptsTable.id, scoresTable.promptId))
        .innerJoin(
          providerModelsTable,
          eq(providerModelsTable.id, responsesTable.modelId)
        )
        .groupBy(providerModelsTable.id)
        .where(
          and(
            options.revealedResponses !== undefined
              ? eq(responsesTable.isRevealed, options.revealedResponses)
              : undefined
          )
        )
        .orderBy(
          desc(sql`AVG(${weightedScoreSql})`),
          desc(sql`COUNT(${scoresTable.id})`)
        );

      // Filter by minimum coverage percentage if specified
      const totalDistinctPrompts = stats?.totalDistinctPrompts ?? 0;
      const filteredLeaderboardData =
        options.minCoverage !== undefined && totalDistinctPrompts > 0
          ? leaderboardData.filter((entry) => {
              const coverage =
                (entry.uniquePrompts / totalDistinctPrompts) * 100;
              return coverage >= options.minCoverage!;
            })
          : leaderboardData;

      return {
        leaderboard: filteredLeaderboardData,
        stats: {
          totalDistinctPrompts: stats?.totalDistinctPrompts ?? 0,
          totalResponses: stats?.totalResponses ?? 0,
          totalScores: stats?.totalScores ?? 0,
        },
        promptSetDistribution: promptSetDistribution.map((item) => ({
          promptSetId: item.promptSetId,
          promptSetTitle: item.promptSetTitle,
          promptCount: item.promptCount,
        })),
      };
    }, options?.tx);
  }

  static async getUserWeightedSimulationLeaderboard(
    options: DbOptions & {
      requestedByUserId?: string;
      accessReason?: PromptAccessReason;
      minCoverage?: number;
      promptAgeWeighting?: "none" | "linear" | "exponential";
      responseDelayWeighting?: "none" | "linear" | "exponential";
      userScoringAlgorithm?: "simScores001" | "simScores002";
      userWeightMultiplier?: number;
      filters?: z.infer<typeof promptFiltersSchema>;
    } = {}
  ) {
    return withTxOrDb(async (tx) => {
      const algorithm = options.userScoringAlgorithm || "simScores001";
      const userWeightMultiplier = options.userWeightMultiplier ?? 0;

      // Use the same pattern as getCuratedLeaderboard - buildGetPromptsQuery handles all filtering
      const promptsSubQuery = PromptService.buildGetPromptsQuery({
        tx,
        requestedByUserId: options.requestedByUserId,
        accessReason: options.accessReason,
        filters: options.filters,
      }).as("sq_prompts");

      // Calculate overall statistics for the filtered prompts
      const stats = await tx
        .with(promptsSubQuery)
        .select({
          totalDistinctPrompts:
            sql<number>`COUNT(DISTINCT ${promptsSubQuery.id})`.mapWith(Number),
          totalResponses:
            sql<number>`COUNT(DISTINCT ${responsesTable.id})`.mapWith(Number),
          totalScores: sql<number>`COUNT(${scoresTable.id})`.mapWith(Number),
        })
        .from(promptsSubQuery)
        .leftJoin(scoresTable, eq(scoresTable.promptId, promptsSubQuery.id))
        .leftJoin(responsesTable, eq(responsesTable.id, scoresTable.responseId))
        .then((result) => result[0]);

      // Calculate distribution of prompts by prompt set
      const promptSetDistribution = await tx
        .with(promptsSubQuery)
        .select({
          promptSetId: promptSetPrompts.promptSetId,
          promptSetTitle: promptSetsTable.title,
          promptCount:
            sql<number>`COUNT(DISTINCT ${promptsSubQuery.id})`.mapWith(Number),
        })
        .from(promptsSubQuery)
        .innerJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptId, promptsSubQuery.id)
        )
        .innerJoin(
          promptSetsTable,
          eq(promptSetsTable.id, promptSetPrompts.promptSetId)
        )
        .groupBy(promptSetPrompts.promptSetId, promptSetsTable.title)
        .orderBy(desc(sql`COUNT(DISTINCT ${promptsSubQuery.id})`));

      // Build weighted score calculation based on options
      let weightedScoreSql = sql<number>`${scoresTable.score}`;

      // Apply prompt age weighting if specified
      if (options.promptAgeWeighting && options.promptAgeWeighting !== "none") {
        const ageWeightFormula =
          options.promptAgeWeighting === "linear"
            ? sql`GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - ${promptsTable.createdAt})) / (86400.0 * 365)))`
            : sql`EXP(-EXTRACT(EPOCH FROM (NOW() - ${promptsTable.createdAt})) / (86400.0 * 180))`;
        weightedScoreSql = sql<number>`${scoresTable.score} * ${ageWeightFormula}`;
      }

      // Apply response delay weighting if specified
      if (
        options.responseDelayWeighting &&
        options.responseDelayWeighting !== "none"
      ) {
        const delayWeightFormula =
          options.responseDelayWeighting === "linear"
            ? sql`GREATEST(0, 1 - (EXTRACT(EPOCH FROM (${responsesTable.createdAt} - ${promptsTable.createdAt})) / (86400.0 * 365)))`
            : sql`EXP(-EXTRACT(EPOCH FROM (${responsesTable.createdAt} - ${promptsTable.createdAt})) / (86400.0 * 180))`;
        weightedScoreSql = sql<number>`${weightedScoreSql} * ${delayWeightFormula}`;
      }

      // Create a CTE to get distinct uploaders from filtered prompts
      const relevantUploadersCTE = tx.$with("relevant_uploaders").as(
        tx
          .selectDistinct({
            uploaderId: hashRegistrationsTable.uploaderId,
          })
          .from(promptsSubQuery)
          .innerJoin(promptsTable, eq(promptsTable.id, promptsSubQuery.id))
          .innerJoin(
            hashRegistrationsTable,
            and(
              eq(
                promptsTable.hashSha256Registration,
                hashRegistrationsTable.sha256
              ),
              eq(promptsTable.hashCIDRegistration, hashRegistrationsTable.cid)
            )
          )
          .where(isNotNull(hashRegistrationsTable.uploaderId))
      );

      // Create a CTE to calculate user scores only for relevant uploaders
      const userScoresCTE = tx.$with("user_scores").as(
        tx
          .with(relevantUploadersCTE)
          .select({
            uploaderId: relevantUploadersCTE.uploaderId,
            userScore:
              algorithm === "simScores001"
                ? sql<number>`LEAST(1.0, 0.5 +
                    (COUNT(DISTINCT CASE WHEN ${quickFeedbacksTable.opinion} = 'positive' THEN ${quickFeedbacksTable.id} END)::float * 0.01) +
                    (COALESCE(MAX(${userStatsView.uploadedPromptCount}), 0)::float * 0.005)
                  )`.as("user_score")
                : sql<number>`LEAST(1.0, 0.3 +
                    (COUNT(DISTINCT CASE WHEN ${quickFeedbacksTable.opinion} = 'positive' THEN ${quickFeedbacksTable.id} END)::float * 0.015) +
                    (COALESCE(MAX(${userStatsView.uploadedPromptCount}), 0)::float * 0.003)
                  )`.as("user_score"),
          })
          .from(relevantUploadersCTE)
          .leftJoin(
            hashRegistrationsTable,
            eq(
              hashRegistrationsTable.uploaderId,
              relevantUploadersCTE.uploaderId
            )
          )
          .leftJoin(
            promptsTable,
            and(
              eq(
                promptsTable.hashSha256Registration,
                hashRegistrationsTable.sha256
              ),
              eq(promptsTable.hashCIDRegistration, hashRegistrationsTable.cid)
            )
          )
          .leftJoin(
            quickFeedbacksTable,
            eq(quickFeedbacksTable.promptId, promptsTable.id)
          )
          .leftJoin(
            userStatsView,
            eq(userStatsView.id, relevantUploadersCTE.uploaderId)
          )
          .groupBy(relevantUploadersCTE.uploaderId)
      );

      // Apply user score weighting
      const userWeightFactor = sql<number>`(1.0 + ${userWeightMultiplier} * (COALESCE(${userScoresCTE.userScore}, 0.5) - 0.5))`;
      const finalWeightedScore = sql<number>`${weightedScoreSql} * ${userWeightFactor}`;

      // Now compute leaderboard data from the filtered prompts
      const leaderboardData = await tx
        .with(promptsSubQuery, relevantUploadersCTE, userScoresCTE)
        .select({
          modelProvider: sql<string>`MIN(${providerModelsTable.provider})`.as(
            "model_provider"
          ),
          modelName: sql<string>`MIN(${providerModelsTable.modelId})`.as(
            "model_name"
          ),
          modelId: providerModelsTable.id,
          avgWeightedScore: sql<number>`AVG(${finalWeightedScore})`.mapWith(
            Number
          ),
          avgOriginalScore: sql<number>`AVG(${scoresTable.score})`.mapWith(
            Number
          ),
          totalScores: sql<number>`COUNT(${scoresTable.id})`.mapWith(Number),
          uniquePrompts:
            sql<number>`COUNT(DISTINCT ${scoresTable.promptId})`.mapWith(
              Number
            ),
          avgResponseTime: sql<number>`AVG(
              EXTRACT(EPOCH FROM (${responsesTable.finishedAt} - ${responsesTable.startedAt}))
            ) FILTER (WHERE EXTRACT(EPOCH FROM (${responsesTable.finishedAt} - ${responsesTable.startedAt})) > 0)`.mapWith(
            Number
          ),
          avgUploaderScore:
            sql<number>`AVG(COALESCE(${userScoresCTE.userScore}, 0.5))`.mapWith(
              Number
            ),
        })
        .from(promptsSubQuery)
        .innerJoin(scoresTable, eq(scoresTable.promptId, promptsSubQuery.id))
        .innerJoin(
          responsesTable,
          eq(responsesTable.id, scoresTable.responseId)
        )
        .innerJoin(promptsTable, eq(promptsTable.id, scoresTable.promptId))
        .innerJoin(
          hashRegistrationsTable,
          and(
            eq(
              promptsTable.hashSha256Registration,
              hashRegistrationsTable.sha256
            ),
            eq(promptsTable.hashCIDRegistration, hashRegistrationsTable.cid)
          )
        )
        .leftJoin(
          userScoresCTE,
          eq(userScoresCTE.uploaderId, hashRegistrationsTable.uploaderId)
        )
        .innerJoin(
          providerModelsTable,
          eq(providerModelsTable.id, responsesTable.modelId)
        )
        .groupBy(providerModelsTable.id)
        .orderBy(
          desc(sql`AVG(${finalWeightedScore})`),
          desc(sql`COUNT(${scoresTable.id})`)
        );

      // Transform results
      const transformedLeaderboard = leaderboardData.map((row) => ({
        modelId: row.modelId,
        modelProvider: row.modelProvider,
        modelName: row.modelName,
        avgWeightedScore: row.avgWeightedScore,
        avgOriginalScore: row.avgOriginalScore,
        totalScores: row.totalScores,
        uniquePrompts: row.uniquePrompts,
        avgResponseTime: row.avgResponseTime || null,
        avgUploaderScore: row.avgUploaderScore,
      }));

      // Filter by minimum coverage percentage if specified
      const totalDistinctPrompts = stats?.totalDistinctPrompts ?? 0;
      const filteredLeaderboardData =
        options.minCoverage !== undefined && totalDistinctPrompts > 0
          ? transformedLeaderboard.filter((entry) => {
              const coverage =
                (entry.uniquePrompts / totalDistinctPrompts) * 100;
              return coverage >= options.minCoverage!;
            })
          : transformedLeaderboard;

      return {
        leaderboard: filteredLeaderboardData,
        stats: {
          totalDistinctPrompts: stats?.totalDistinctPrompts ?? 0,
          totalResponses: stats?.totalResponses ?? 0,
          totalScores: stats?.totalScores ?? 0,
        },
        promptSetDistribution: promptSetDistribution.map((item) => ({
          promptSetId: item.promptSetId,
          promptSetTitle: item.promptSetTitle,
          promptCount: item.promptCount,
        })),
      };
    }, options?.tx);
  }
}

export type GetPromptsReturnItem = Awaited<
  ReturnType<typeof PromptService.getPrompts>
>["data"][number];

export type GetPromptsAsFileStructuredReturnItem = Awaited<
  ReturnType<typeof PromptService.getPromptsAsFileStructured>
>["data"][number];

export type GetCuratedLeaderboardReturn = Awaited<
  ReturnType<typeof PromptService.getCuratedLeaderboard>
>;

export type GetCuratedLeaderboardReturnItem =
  GetCuratedLeaderboardReturn["leaderboard"][number];

export type GetUserWeightedSimulationLeaderboardReturn = Awaited<
  ReturnType<typeof PromptService.getUserWeightedSimulationLeaderboard>
>;

export type GetPromptsStatusReturnItem = Awaited<
  ReturnType<typeof PromptService.getPromptsStatuses>
>[number];
