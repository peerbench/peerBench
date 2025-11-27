import {
  quickFeedbacksTable,
  promptsTable,
  responsesTable,
  scoresTable,
  promptSetsTable,
  promptSetPrompts,
  hashRegistrationsTable,
  promptCommentsTable,
  responseCommentsTable,
  scoreCommentsTable,
} from "@/database/schema";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { DbOptions } from "@/types/db";
import { withTxOrDb } from "@/database/helpers";

export class ActivityService {
  /**
   * Get recent feedbacks (reviews) given by a user
   */
  static async getRecentFeedbacks(
    options: {
      userId: string;
      limit?: number;
    } & DbOptions
  ) {
    return withTxOrDb(async (tx) => {
      const limit = options.limit || 20;

      const feedbacks = await tx
        .select({
          id: quickFeedbacksTable.id,
          opinion: quickFeedbacksTable.opinion,
          createdAt: quickFeedbacksTable.createdAt,
          promptId: sql<string | null>`
            COALESCE(
              ${quickFeedbacksTable.promptId},
              ${responsesTable.promptId},
              ${scoresTable.promptId}
            )
          `.as("prompt_id"),
          responseId: sql<string | null>`
            COALESCE(
              ${quickFeedbacksTable.responseId},
              ${scoresTable.responseId}
            )
          `.as("response_id"),
          scoreId: quickFeedbacksTable.scoreId,
          promptQuestion: promptsTable.question,
          entityType: sql<string>`
            CASE
              WHEN ${quickFeedbacksTable.promptId} IS NOT NULL THEN 'prompt'
              WHEN ${quickFeedbacksTable.responseId} IS NOT NULL THEN 'response'
              WHEN ${quickFeedbacksTable.scoreId} IS NOT NULL THEN 'score'
              ELSE 'unknown'
            END
          `.as("entity_type"),
        })
        .from(quickFeedbacksTable)
        .leftJoin(
          promptsTable,
          sql`${promptsTable.id} = COALESCE(
            ${quickFeedbacksTable.promptId},
            (SELECT ${responsesTable.promptId} FROM ${responsesTable} WHERE ${responsesTable.id} = ${quickFeedbacksTable.responseId}),
            (SELECT ${scoresTable.promptId} FROM ${scoresTable} WHERE ${scoresTable.id} = ${quickFeedbacksTable.scoreId})
          )`
        )
        .leftJoin(
          responsesTable,
          sql`${responsesTable.id} = COALESCE(
            ${quickFeedbacksTable.responseId},
            (SELECT ${scoresTable.responseId} FROM ${scoresTable} WHERE ${scoresTable.id} = ${quickFeedbacksTable.scoreId})
          )`
        )
        .leftJoin(scoresTable, eq(quickFeedbacksTable.scoreId, scoresTable.id))
        .where(eq(quickFeedbacksTable.userId, options.userId))
        .orderBy(desc(quickFeedbacksTable.createdAt))
        .limit(limit);

      return feedbacks;
    }, options.tx);
  }

  /**
   * Get recent prompts created by a user
   */
  static async getRecentPrompts(
    options: {
      userId: string;
      limit?: number;
    } & DbOptions
  ) {
    return withTxOrDb(async (tx) => {
      const limit = options.limit || 20;

      const prompts = await tx
        .select({
          id: promptsTable.id,
          question: promptsTable.question,
          type: promptsTable.type,
          createdAt: promptsTable.createdAt,
          promptSetId: promptSetPrompts.promptSetId,
          promptSetTitle: promptSetsTable.title,
        })
        .from(promptsTable)
        .leftJoin(
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
          promptSetPrompts,
          eq(promptsTable.id, promptSetPrompts.promptId)
        )
        .leftJoin(
          promptSetsTable,
          eq(promptSetPrompts.promptSetId, promptSetsTable.id)
        )
        .where(eq(hashRegistrationsTable.uploaderId, options.userId))
        .orderBy(desc(promptsTable.createdAt))
        .limit(limit);

      return prompts;
    }, options.tx);
  }

  /**
   * Get recent prompt sets (benchmarks) created by a user
   */
  static async getRecentPromptSets(
    options: {
      userId: string;
      limit?: number;
    } & DbOptions
  ) {
    return withTxOrDb(async (tx) => {
      const limit = options.limit || 20;

      const promptSets = await tx
        .select({
          id: promptSetsTable.id,
          title: promptSetsTable.title,
          description: promptSetsTable.description,
          category: promptSetsTable.category,
          isPublic: promptSetsTable.isPublic,
          createdAt: promptSetsTable.createdAt,
          promptCount: sql<number>`
            COUNT(DISTINCT ${promptSetPrompts.promptId})
          `.mapWith(Number),
        })
        .from(promptSetsTable)
        .leftJoin(
          promptSetPrompts,
          eq(promptSetsTable.id, promptSetPrompts.promptSetId)
        )
        .where(
          and(
            eq(promptSetsTable.ownerId, options.userId),
            isNull(promptSetsTable.deletedAt)
          )
        )
        .groupBy(promptSetsTable.id)
        .orderBy(desc(promptSetsTable.createdAt))
        .limit(limit);

      return promptSets;
    }, options.tx);
  }

  /**
   * Get recent comments made by a user across all comment types
   * Optimized to reduce DB load by avoiding joins
   */
  static async getRecentComments(
    options: {
      userId: string;
      limit?: number;
    } & DbOptions
  ) {
    return withTxOrDb(async (tx) => {
      const limit = options.limit || 20;

      // Get prompt comments
      const promptComments = await tx
        .select({
          id: promptCommentsTable.id,
          content: promptCommentsTable.content,
          createdAt: promptCommentsTable.createdAt,
          promptId: promptCommentsTable.promptId,
          responseId: sql<string | null>`NULL`.as("response_id"),
          scoreId: sql<string | null>`NULL`.as("score_id"),
          entityType: sql<string>`'prompt'`.as("entity_type"),
        })
        .from(promptCommentsTable)
        .where(eq(promptCommentsTable.userId, options.userId))
        .orderBy(desc(promptCommentsTable.createdAt))
        .limit(limit);

      // Get response comments - minimal join to get promptId for linking
      const responseComments = await tx
        .select({
          id: responseCommentsTable.id,
          content: responseCommentsTable.content,
          createdAt: responseCommentsTable.createdAt,
          promptId: responsesTable.promptId,
          responseId: responseCommentsTable.responseId,
          scoreId: sql<string | null>`NULL`.as("score_id"),
          entityType: sql<string>`'response'`.as("entity_type"),
        })
        .from(responseCommentsTable)
        .leftJoin(responsesTable, eq(responseCommentsTable.responseId, responsesTable.id))
        .where(eq(responseCommentsTable.userId, options.userId))
        .orderBy(desc(responseCommentsTable.createdAt))
        .limit(limit);

      // Get score comments - minimal join to get promptId and responseId for linking
      const scoreComments = await tx
        .select({
          id: scoreCommentsTable.id,
          content: scoreCommentsTable.content,
          createdAt: scoreCommentsTable.createdAt,
          promptId: scoresTable.promptId,
          responseId: scoresTable.responseId,
          scoreId: scoreCommentsTable.scoreId,
          entityType: sql<string>`'score'`.as("entity_type"),
        })
        .from(scoreCommentsTable)
        .leftJoin(scoresTable, eq(scoreCommentsTable.scoreId, scoresTable.id))
        .where(eq(scoreCommentsTable.userId, options.userId))
        .orderBy(desc(scoreCommentsTable.createdAt))
        .limit(limit);

      // Combine all comments and sort by createdAt
      const allComments = [
        ...promptComments,
        ...responseComments,
        ...scoreComments,
      ]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, limit);

      return allComments;
    }, options.tx);
  }
}
