import {
  getColumnName,
  insertInto,
  jsonbBuildObject,
  withTxOrTx,
} from "@/database/helpers";
import {
  notificationsTable,
  promptSetPrompts,
  promptSetsTable,
  promptsTable,
  quickFeedbackFlagsTable,
  quickFeedbacksTable,
  responsesTable,
  scoresTable,
  userNotificationSubscriptionsView,
  userRoleOnPromptSetTable,
  usersView,
} from "@/database/schema";
import {
  NotificationType,
  NotificationTypes,
  QuickFeedbackOpinion,
  UserRoleOnPromptSet,
} from "@/database/types";
import { ApiError } from "@/errors/api-error";
import { ADMIN_USER_ID } from "@/lib/constants";
import { DbOptions } from "@/types/db";
import { and, eq, isNotNull, not, sql, StringChunk } from "drizzle-orm";

export class QuickFeedbackService {
  static async upsertQuickFeedback(
    data: {
      promptId?: string;
      scoreId?: string;
      responseId?: string;

      userId: string;
      opinion: QuickFeedbackOpinion;
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

        // Apply ACL rules for different relationships
        if (data.responseId !== undefined) {
          promptSets = await tx
            .select({
              promptSetId: promptSetsTable.id,
              isPublic: promptSetsTable.isPublic,
              isPublicSubmissionsAllowed:
                promptSetsTable.isPublicSubmissionsAllowed,
              userRole: userRoleOnPromptSetTable.role,
            })
            .from(responsesTable)
            .leftJoin(
              promptsTable,
              eq(responsesTable.promptId, promptsTable.id)
            )
            .leftJoin(
              promptSetPrompts,
              eq(promptSetPrompts.promptId, promptsTable.id)
            )
            .leftJoin(
              promptSetsTable,
              eq(promptSetPrompts.promptSetId, promptSetsTable.id)
            )
            .leftJoin(
              userRoleOnPromptSetTable,
              eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
            )
            .where(eq(responsesTable.id, data.responseId));

          if (promptSets.length === 0) {
            throw ApiError.notFound("Response not found");
          }
        } else if (data.promptId !== undefined) {
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
              eq(promptSetPrompts.promptSetId, promptSetsTable.id)
            )
            .leftJoin(
              userRoleOnPromptSetTable,
              eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
            )
            .where(eq(promptsTable.id, data.promptId));

          if (promptSets.length === 0) {
            throw ApiError.notFound("Prompt not found");
          }
        } else if (data.scoreId !== undefined) {
          promptSets = await tx
            .select({
              promptSetId: promptSetsTable.id,
              isPublic: promptSetsTable.isPublic,
              isPublicSubmissionsAllowed:
                promptSetsTable.isPublicSubmissionsAllowed,
              userRole: userRoleOnPromptSetTable.role,
            })
            .from(scoresTable)
            .leftJoin(promptsTable, eq(scoresTable.promptId, promptsTable.id))
            .leftJoin(
              promptSetPrompts,
              eq(promptSetPrompts.promptId, promptsTable.id)
            )
            .leftJoin(
              promptSetsTable,
              eq(promptSetPrompts.promptSetId, promptSetsTable.id)
            )
            .leftJoin(
              userRoleOnPromptSetTable,
              eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
            )
            .where(eq(scoresTable.id, data.scoreId));

          if (promptSets.length === 0) {
            throw ApiError.notFound("Score not found");
          }
        }

        // If there is only one Prompt Set that allows
        // user to give feedback, then we can continue.
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

      const relationColumns = [
        data.promptId !== undefined ? quickFeedbacksTable.promptId : null,
        data.scoreId !== undefined ? quickFeedbacksTable.scoreId : null,
        data.responseId !== undefined ? quickFeedbacksTable.responseId : null,
      ].filter(Boolean);
      if (relationColumns.length !== 1) {
        throw ApiError.badRequest("Only one relation can be provided");
      }

      const result = await tx
        .insert(quickFeedbacksTable)
        .values({
          promptId: data.promptId,
          scoreId: data.scoreId,
          responseId: data.responseId,
          userId: data.userId,
          opinion: data.opinion,
        })
        .onConflictDoUpdate({
          // If user already has a feedback for the same entity, just update the opinion
          target: [quickFeedbacksTable.userId, relationColumns[0]!],
          set: {
            opinion: data.opinion,
            updatedAt: sql`NOW()`,
          },
        })
        .returning({
          isNewInsert: sql<boolean>`${eq(
            quickFeedbacksTable.updatedAt,
            quickFeedbacksTable.createdAt
          )}`,
        })
        .then((r) => r[0]!);

      // Send notification to all users that have interacted with the entity only if this is a new quick feedback
      if (result.isNewInsert) {
        // TODO: Expand to other entities (currently only Prompts are supported)
        if (data.promptId !== undefined) {
          // Sub query to get the info of the user that gave the feedback.
          const feedbackGiverSubQuery = tx.$with("sq_feedback_giver").as((qb) =>
            qb
              .select({
                promptId: sql<string>`${data.promptId}::uuid`.as("prompt_id"),
                feedbackGiverUserId: usersView.id,
                feedbackGiverUserDisplayName: sql<string>`
                  COALESCE(${usersView.displayName}, 'User ' || ${usersView.id})
                `.as("feedback_giver_user_display_name"),
              })
              .from(usersView)
              .where(eq(usersView.id, data.userId))
          );

          // Add notification for all the users that has interacted with the Prompt
          const insertSelect = tx
            .with(feedbackGiverSubQuery)
            .select({
              // Use the same SQL column names as the INSERT statement.
              [getColumnName(notificationsTable.userId)]:
                userNotificationSubscriptionsView.userId,
              // NOTE: Update this part in case if you want to change notification message
              [getColumnName(notificationsTable.content)]: sql<string>`
                FORMAT(
                  '%s gave a %s feedback on %s Prompt "%s"',
                  ${feedbackGiverSubQuery.feedbackGiverUserDisplayName},
                  ${data.opinion}::text,
                  CASE
                    WHEN ${eq(userNotificationSubscriptionsView.userId, promptsTable.uploaderId)} THEN 'your'
                    ELSE 'the'
                  END,
                  COALESCE(
                    LEFT(${promptsTable.question}, 20),
                    ${promptsTable.id}::text
                  )
                )`,
              [getColumnName(notificationsTable.type)]:
                sql<NotificationType>`${NotificationTypes.promptQuickFeedback}`,
              [getColumnName(notificationsTable.metadata)]: jsonbBuildObject({
                opinion: sql<QuickFeedbackOpinion>`${data.opinion}::text`,
                promptId: promptsTable.id,
              }),
            })
            .from(userNotificationSubscriptionsView)
            .innerJoin(
              feedbackGiverSubQuery,
              eq(
                // https://github.com/drizzle-team/drizzle-orm/issues/3731
                sql.join([
                  new StringChunk(`"${feedbackGiverSubQuery._.alias}"`),
                  new StringChunk("."),
                  feedbackGiverSubQuery.promptId,
                ]),
                userNotificationSubscriptionsView.promptId
              )
            )
            .innerJoin(
              promptsTable,
              eq(userNotificationSubscriptionsView.promptId, promptsTable.id)
            )
            .groupBy(
              userNotificationSubscriptionsView.userId,
              feedbackGiverSubQuery.feedbackGiverUserId,
              feedbackGiverSubQuery.feedbackGiverUserDisplayName,
              promptsTable.id,
              promptsTable.question
            )
            .where(
              and(
                eq(userNotificationSubscriptionsView.promptId, data.promptId),
                not(eq(userNotificationSubscriptionsView.userId, data.userId))
              )
            )
            .$dynamic();

          // NOTE: Drizzle has issues with TS native `INSERT ... SELECT` that's why we
          // are using SQL directly. More info: https://github.com/drizzle-team/drizzle-orm/issues/3608
          await tx.execute(
            sql`${insertInto(notificationsTable, [
              sql.raw(getColumnName(notificationsTable.userId)),
              sql.raw(getColumnName(notificationsTable.content)),
              sql.raw(getColumnName(notificationsTable.type)),
              sql.raw(getColumnName(notificationsTable.metadata)),
            ])} ${insertSelect}`
          );
        }
      }
    });
  }

  static buildQuickFeedbackFlagsAggregation() {
    return sql<{ id: number; flag: string; opinion: QuickFeedbackOpinion }[]>`
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', ${quickFeedbackFlagsTable.id},
            'flag', ${quickFeedbackFlagsTable.flag},
            'opinion', ${quickFeedbackFlagsTable.opinion}
          )
        ) FILTER (WHERE ${isNotNull(quickFeedbackFlagsTable.flag)}),
        '[]'::jsonb
      )
    `;
  }
}
