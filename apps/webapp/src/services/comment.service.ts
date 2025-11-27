import { withTxOrDb, withTxOrTx } from "@/database/helpers";
import { paginateQuery } from "@/database/query";
import {
  promptCommentsTable,
  promptSetPrompts,
  promptSetsTable,
  promptsTable,
  responseCommentsTable,
  responsesTable,
  scoreCommentsTable,
  scoresTable,
  userRoleOnPromptSetTable,
  usersView,
} from "@/database/schema";
import { UserRoleOnPromptSet } from "@/database/types";
import { ApiError } from "@/errors/api-error";
import { ADMIN_USER_ID } from "@/lib/constants";
import { DbOptions, PaginationOptions } from "@/types/db";
import {
  and,
  countDistinct,
  desc,
  eq,
  inArray,
  isNull,
  or,
  SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export class CommentService {
  static async insertPromptComment(
    data: {
      promptId: string;
      parentCommentId?: number;

      content: string;
      userId: string;
    },
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrTx(async (tx) => {
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        let isAllowed = false;
        let promptSets: {
          promptSetId: number | null;
          isPublic: boolean | null;
          isPublicSubmissionsAllowed: boolean | null;
          userRole: UserRoleOnPromptSet | null;
        }[] = [];

        promptSets = await tx
          .select({
            promptSetId: promptSetsTable.id,
            isPublic: promptSetsTable.isPublic,
            isPublicSubmissionsAllowed:
              promptSetsTable.isPublicSubmissionsAllowed,
            userRole: userRoleOnPromptSetTable.role,
          })
          .from(promptsTable)
          .leftJoin(
            promptSetPrompts,
            eq(promptSetPrompts.promptId, promptsTable.id)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetsTable.id, promptSetPrompts.promptSetId)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
          )
          .where(eq(promptsTable.id, data.promptId));

        if (promptSets.length === 0) {
          throw ApiError.notFound("Prompt not found");
        }

        // If there is only one Prompt Set that allows user to comment,
        // then we can continue.
        for (const promptSet of promptSets) {
          if (
            promptSet.isPublicSubmissionsAllowed ||
            promptSet.userRole === UserRoleOnPromptSet.owner ||
            promptSet.userRole === UserRoleOnPromptSet.admin ||
            promptSet.userRole === UserRoleOnPromptSet.collaborator ||
            promptSet.userRole === UserRoleOnPromptSet.reviewer
          ) {
            isAllowed = true;
            break;
          }
        }
        if (!isAllowed) {
          throw ApiError.forbidden();
        }
      }

      const [comment] = await tx
        .insert(promptCommentsTable)
        .values(data)
        .returning();

      return comment!.id;
    }, options?.tx);
  }

  static async getPromptComments(
    options?: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        filters?: {
          promptId?: string;
          parentCommentId?: number;
        };
      }
  ) {
    return withTxOrDb(async (tx) => {
      const replies = alias(promptCommentsTable, "replies");

      let query = tx
        .select({
          id: promptCommentsTable.id,
          userId: promptCommentsTable.userId,
          userDisplayName: usersView.displayName,
          content: promptCommentsTable.content,
          promptId: promptCommentsTable.promptId,
          parentCommentId: promptCommentsTable.parentCommentId,
          createdAt: promptCommentsTable.createdAt,
          updatedAt: promptCommentsTable.updatedAt,
          replyCount: countDistinct(replies.id),

          // TODO: Maybe include first 5 replies?
        })
        .from(promptCommentsTable)
        .innerJoin(usersView, eq(promptCommentsTable.userId, usersView.id))
        .leftJoin(replies, eq(replies.parentCommentId, promptCommentsTable.id))
        .orderBy(desc(promptCommentsTable.createdAt))
        .groupBy(promptCommentsTable.id, usersView.displayName)
        .$dynamic();
      let countQuery = tx
        .select({ count: countDistinct(promptCommentsTable.id) })
        .from(promptCommentsTable)
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [];

      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        query = query
          .leftJoin(
            promptsTable,
            eq(promptCommentsTable.promptId, promptsTable.id)
          )
          .leftJoin(
            promptSetPrompts,
            eq(promptsTable.id, promptSetPrompts.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetPrompts.promptSetId, promptSetsTable.id)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
          );
        countQuery = countQuery
          .leftJoin(
            promptsTable,
            eq(promptCommentsTable.promptId, promptsTable.id)
          )
          .leftJoin(
            promptSetPrompts,
            eq(promptsTable.id, promptSetPrompts.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetPrompts.promptSetId, promptSetsTable.id)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
          );

        whereConditions.push(
          or(
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
          eq(promptCommentsTable.promptId, options.filters.promptId),

          // If the caller is not looking for the replies, then only include top level comments
          options?.filters?.parentCommentId === undefined
            ? isNull(promptCommentsTable.parentCommentId)
            : undefined
        );
      }

      if (options?.filters?.parentCommentId !== undefined) {
        whereConditions.push(
          eq(
            promptCommentsTable.parentCommentId,
            options.filters.parentCommentId
          )
        );
      }

      return paginateQuery(
        query.where(and(...whereConditions)),
        countQuery.where(and(...whereConditions)),
        {
          page: options?.page,
          pageSize: options?.pageSize,
        }
      );
    }, options?.tx);
  }

  static async insertResponseComment(
    data: {
      responseId: string;
      parentCommentId?: number;
      content: string;
      userId: string;
    },
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrTx(async (tx) => {
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        let isAllowed = false;
        let promptSets: {
          promptSetId: number | null;
          isPublic: boolean | null;
          isPublicSubmissionsAllowed: boolean | null;
          userRole: UserRoleOnPromptSet | null;
        }[] = [];

        promptSets = await tx
          .select({
            promptSetId: promptSetsTable.id,
            isPublic: promptSetsTable.isPublic,
            isPublicSubmissionsAllowed:
              promptSetsTable.isPublicSubmissionsAllowed,
            userRole: userRoleOnPromptSetTable.role,
          })
          .from(responsesTable)
          .leftJoin(promptsTable, eq(responsesTable.promptId, promptsTable.id))
          .leftJoin(
            promptSetPrompts,
            eq(promptsTable.id, promptSetPrompts.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetsTable.id, promptSetPrompts.promptSetId)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
          )
          .where(eq(responsesTable.id, data.responseId));

        if (promptSets.length === 0) {
          throw ApiError.notFound("Response not found");
        }

        // If there is only one Prompt Set that allows user to comment,
        // then we can continue.
        for (const promptSet of promptSets) {
          if (
            promptSet.isPublicSubmissionsAllowed ||
            promptSet.userRole === UserRoleOnPromptSet.owner ||
            promptSet.userRole === UserRoleOnPromptSet.admin ||
            promptSet.userRole === UserRoleOnPromptSet.collaborator ||
            promptSet.userRole === UserRoleOnPromptSet.reviewer
          ) {
            isAllowed = true;
            break;
          }
        }
        if (!isAllowed) {
          throw ApiError.forbidden();
        }
      }

      const [comment] = await tx
        .insert(responseCommentsTable)
        .values(data)
        .returning();

      return comment!.id;
    }, options?.tx);
  }

  static async getResponseComments(
    options?: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        filters?: {
          responseId?: string;
          parentCommentId?: number;
        };
      }
  ) {
    return withTxOrDb(async (tx) => {
      const replies = alias(responseCommentsTable, "replies");

      let query = tx
        .select({
          id: responseCommentsTable.id,
          userId: responseCommentsTable.userId,
          userDisplayName: usersView.displayName,
          content: responseCommentsTable.content,
          responseId: responseCommentsTable.responseId,
          parentCommentId: responseCommentsTable.parentCommentId,
          createdAt: responseCommentsTable.createdAt,
          updatedAt: responseCommentsTable.updatedAt,
          replyCount: countDistinct(replies.id),

          // TODO: Maybe include first 5 replies?
        })
        .from(responseCommentsTable)
        .innerJoin(usersView, eq(responseCommentsTable.userId, usersView.id))
        .leftJoin(
          replies,
          eq(replies.parentCommentId, responseCommentsTable.id)
        )
        .orderBy(desc(responseCommentsTable.createdAt))
        .groupBy(responseCommentsTable.id, usersView.displayName)
        .$dynamic();
      let countQuery = tx
        .select({ count: countDistinct(responseCommentsTable.id) })
        .from(responseCommentsTable)
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [];

      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        query = query
          .leftJoin(
            responsesTable,
            eq(responseCommentsTable.responseId, responsesTable.id)
          )
          .leftJoin(promptsTable, eq(responsesTable.promptId, promptsTable.id))
          .leftJoin(
            promptSetPrompts,
            eq(promptsTable.id, promptSetPrompts.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetPrompts.promptSetId, promptSetsTable.id)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
          );
        countQuery = countQuery
          .leftJoin(
            responsesTable,
            eq(responseCommentsTable.responseId, responsesTable.id)
          )
          .leftJoin(promptsTable, eq(responsesTable.promptId, promptsTable.id))
          .leftJoin(
            promptSetPrompts,
            eq(promptsTable.id, promptSetPrompts.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetPrompts.promptSetId, promptSetsTable.id)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
          );

        whereConditions.push(
          or(
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
          eq(responseCommentsTable.responseId, options.filters.responseId),

          // If the caller is not looking for the replies, then only include top level comments
          options?.filters?.parentCommentId === undefined
            ? isNull(responseCommentsTable.parentCommentId)
            : undefined
        );
      }

      if (options?.filters?.parentCommentId !== undefined) {
        whereConditions.push(
          eq(
            responseCommentsTable.parentCommentId,
            options.filters.parentCommentId
          )
        );
      }

      return paginateQuery(
        query.where(and(...whereConditions)),
        countQuery.where(and(...whereConditions)),
        {
          page: options?.page,
          pageSize: options?.pageSize,
        }
      );
    }, options?.tx);
  }

  static async insertScoreComment(
    data: {
      scoreId: string;
      parentCommentId?: number;
      content: string;
      userId: string;
    },
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrTx(async (tx) => {
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        let isAllowed = false;
        let promptSets: {
          promptSetId: number | null;
          isPublic: boolean | null;
          isPublicSubmissionsAllowed: boolean | null;
          userRole: UserRoleOnPromptSet | null;
        }[] = [];

        promptSets = await tx
          .select({
            promptSetId: promptSetsTable.id,
            isPublic: promptSetsTable.isPublic,
            isPublicSubmissionsAllowed:
              promptSetsTable.isPublicSubmissionsAllowed,
            userRole: userRoleOnPromptSetTable.role,
          })
          .from(scoresTable)
          .leftJoin(promptsTable, eq(promptsTable.id, scoresTable.promptId))
          .leftJoin(
            promptSetPrompts,
            eq(promptsTable.id, promptSetPrompts.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetsTable.id, promptSetPrompts.promptSetId)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
          )
          .where(eq(scoresTable.id, data.scoreId));

        if (promptSets.length === 0) {
          throw ApiError.notFound("Score not found");
        }

        // If there is only one Prompt Set that allows user to comment,
        // then we can continue.
        for (const promptSet of promptSets) {
          if (
            promptSet.isPublicSubmissionsAllowed ||
            promptSet.userRole === UserRoleOnPromptSet.owner ||
            promptSet.userRole === UserRoleOnPromptSet.admin ||
            promptSet.userRole === UserRoleOnPromptSet.collaborator ||
            promptSet.userRole === UserRoleOnPromptSet.reviewer
          ) {
            isAllowed = true;
            break;
          }
        }
        if (!isAllowed) {
          throw ApiError.forbidden();
        }
      }

      const [comment] = await tx
        .insert(scoreCommentsTable)
        .values(data)
        .returning();

      return comment!.id;
    }, options?.tx);
  }

  static async getScoreComments(
    options?: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        filters?: {
          scoreId?: string;
          parentCommentId?: number;
        };
      }
  ) {
    return withTxOrDb(async (tx) => {
      const replies = alias(scoreCommentsTable, "replies");

      let query = tx
        .select({
          id: scoreCommentsTable.id,
          userId: scoreCommentsTable.userId,
          userDisplayName: usersView.displayName,
          content: scoreCommentsTable.content,
          scoreId: scoreCommentsTable.scoreId,
          parentCommentId: scoreCommentsTable.parentCommentId,
          createdAt: scoreCommentsTable.createdAt,
          updatedAt: scoreCommentsTable.updatedAt,
          replyCount: countDistinct(replies.id),

          // TODO: Maybe include first 5 replies?
        })
        .from(scoreCommentsTable)
        .innerJoin(usersView, eq(scoreCommentsTable.userId, usersView.id))
        .leftJoin(replies, eq(replies.parentCommentId, scoreCommentsTable.id))
        .orderBy(desc(scoreCommentsTable.createdAt))
        .groupBy(scoreCommentsTable.id, usersView.displayName)
        .$dynamic();
      let countQuery = tx
        .select({ count: countDistinct(scoreCommentsTable.id) })
        .from(scoreCommentsTable)
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [];

      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        query = query
          .leftJoin(scoresTable, eq(scoreCommentsTable.scoreId, scoresTable.id))
          .leftJoin(
            responsesTable,
            eq(scoresTable.responseId, responsesTable.id)
          )
          .leftJoin(promptsTable, eq(responsesTable.promptId, promptsTable.id))
          .leftJoin(
            promptSetPrompts,
            eq(promptsTable.id, promptSetPrompts.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetPrompts.promptSetId, promptSetsTable.id)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
          );
        countQuery = countQuery
          .leftJoin(scoresTable, eq(scoreCommentsTable.scoreId, scoresTable.id))
          .leftJoin(
            responsesTable,
            eq(scoresTable.responseId, responsesTable.id)
          )
          .leftJoin(promptsTable, eq(responsesTable.promptId, promptsTable.id))
          .leftJoin(
            promptSetPrompts,
            eq(promptsTable.id, promptSetPrompts.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetPrompts.promptSetId, promptSetsTable.id)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
          );

        whereConditions.push(
          or(
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

      if (options?.filters?.scoreId !== undefined) {
        whereConditions.push(
          eq(scoreCommentsTable.scoreId, options.filters.scoreId),

          // If the caller is not looking for the replies, then only include top level comments
          options?.filters?.parentCommentId === undefined
            ? isNull(scoreCommentsTable.parentCommentId)
            : undefined
        );
      }

      if (options?.filters?.parentCommentId !== undefined) {
        whereConditions.push(
          eq(
            scoreCommentsTable.parentCommentId,
            options.filters.parentCommentId
          )
        );
      }

      return paginateQuery(
        query.where(and(...whereConditions)),
        countQuery.where(and(...whereConditions)),
        {
          page: options?.page,
          pageSize: options?.pageSize,
        }
      );
    }, options?.tx);
  }
}

export type GetPromptCommentsReturnItem = Awaited<
  ReturnType<typeof CommentService.getPromptComments>
>["data"][number];

export type GetResponseCommentsReturnItem = Awaited<
  ReturnType<typeof CommentService.getResponseComments>
>["data"][number];

export type GetScoreCommentsReturnItem = Awaited<
  ReturnType<typeof CommentService.getScoreComments>
>["data"][number];
