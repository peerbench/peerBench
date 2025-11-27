import { db } from "@/database/client";
import { eq, getViewSelectedFields, sql } from "drizzle-orm";
import { userProfileTable, userStatsView, usersView, promptsTable, quickFeedbacksTable, hashRegistrationsTable } from "@/database/schema";
import { DbOptions } from "@/types/db";
import { withTxOrDb } from "@/database/helpers";
import { ApiError } from "@/errors/api-error";
import { and } from "drizzle-orm";

export class ProfileService {
  static async getUserStats(
    options: DbOptions & {
      userId: string;
    }
  ) {
    return withTxOrDb(async (tx) => {
      const [result] = await tx
        .select()
        .from(userStatsView)
        .where(eq(userStatsView.id, options.userId));

      return result;
    }, options.tx);
  }

  static async getPromptsWithThreePlusFeedbacks(
    options: DbOptions & {
      userId: string;
    }
  ) {
    return withTxOrDb(async (tx) => {
      // Query to get prompts with 3+ positive feedbacks
      // Using a subquery to count feedbacks per prompt
      const promptsWithCounts = await tx
        .select({
          promptId: promptsTable.id,
          feedbackCount: sql<number>`
            (SELECT COUNT(*)::int
             FROM ${quickFeedbacksTable}
             WHERE ${quickFeedbacksTable.promptId} = ${promptsTable.id}
             AND ${quickFeedbacksTable.opinion} = 'positive')
          `.as("feedback_count"),
        })
        .from(promptsTable)
        .innerJoin(
          hashRegistrationsTable,
          and(
            eq(hashRegistrationsTable.cid, promptsTable.hashCIDRegistration),
            eq(hashRegistrationsTable.sha256, promptsTable.hashSha256Registration)
          )
        )
        .where(eq(hashRegistrationsTable.uploaderId, options.userId));

      // Filter in JavaScript to count prompts with 3+ feedbacks
      return promptsWithCounts.filter((p) => p.feedbackCount >= 3).length;
    }, options.tx);
  }

  static async getUserProfile(
    options: DbOptions & {
      userId: string;
      stats?: boolean;
    }
  ) {
    return withTxOrDb(async (tx) => {
      let query = tx
        .select({
          ...getViewSelectedFields(usersView),
          stats: options.stats
            ? getViewSelectedFields(userStatsView)
            : sql<null>`NULL`,
        })
        .from(usersView)
        .where(eq(usersView.id, options.userId));

      if (options.stats) {
        query = query.innerJoin(
          userStatsView,
          eq(userStatsView.id, usersView.id)
        );
      }

      const [profile] = await query;

      return profile;
    }, options.tx);
  }

  static async updateUserProfile(
    data: {
      displayName?: string | null;
      github?: string | null;
      website?: string | null;
      bluesky?: string | null;
      mastodon?: string | null;
      twitter?: string | null;
    },
    options: DbOptions & {
      userId: string;
    }
  ) {
    return withTxOrDb(async (tx) => {
      const updateSubQuery = tx.$with("sq_update").as(
        tx
          .update(userProfileTable)
          .set({
            displayName: data.displayName,
            github: data.github,
            website: data.website,
            bluesky: data.bluesky,
            mastodon: data.mastodon,
            twitter: data.twitter,
          })
          .where(eq(userProfileTable.userId, options.userId))
      );

      // Get the profile data
      const profile = await tx
        .with(updateSubQuery)
        .select()
        .from(usersView)
        .where(eq(usersView.id, options.userId))
        .then((result) => result[0]);

      if (!profile) {
        throw ApiError.notFound("User not found");
      }

      // Return the whole profile data with the updated fields
      return {
        ...profile,
        displayName: data.displayName,
        github: data.github,
        website: data.website,
        bluesky: data.bluesky,
        mastodon: data.mastodon,
        twitter: data.twitter,
      };
    }, options.tx);
  }

  /**
   * @deprecated AI Generated code, don't use if you don't know what you are doing
   */
  static async setInvitedBy(
    userId: string,
    invitedByUserId: string
  ): Promise<boolean> {
    try {
      await db
        .update(userProfileTable)
        .set({
          invitedBy: invitedByUserId,
          updatedAt: new Date(),
        })
        .where(eq(userProfileTable.userId, userId));

      return true;
    } catch (error) {
      console.error("Error setting invited by:", error);
      return false;
    }
  }
}

export type UserProfile = Awaited<
  ReturnType<typeof ProfileService.getUserProfile>
>;

export type UserProfileUpdate = Awaited<
  ReturnType<typeof ProfileService.updateUserProfile>
>;
