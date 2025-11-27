import { withTxOrTx } from "@/database/helpers";
import {
  promptSetPrompts,
  promptSetsTable,
  promptsTable,
  quickFeedbackFlagsTable,
  quickFeedbacksTable,
  responsesTable,
  scoresTable,
  userRoleOnPromptSetTable,
} from "@/database/schema";
import { QuickFeedbackOpinion, UserRoleOnPromptSet } from "@/database/types";
import { ApiError } from "@/errors/api-error";
import { ADMIN_USER_ID } from "@/lib/constants";
import { DbOptions } from "@/types/db";
import { eq, isNotNull, sql } from "drizzle-orm";

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

      await tx
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
          },
        });
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
