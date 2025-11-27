import { db } from "@/database/client";
import {
  userProfileTable,
  promptSetsTable,
  promptsTable,
  filesTable,
  promptSetPrompts,
  quickFeedbacksTable,
  scoresTable,
  userRoleOnPromptSetTable,
} from "@/database/schema";
import { authUsers } from "drizzle-orm/supabase";
import { eq, sql, and, isNotNull, gte, desc } from "drizzle-orm";

export interface UserActivityMetrics {
  userId: string;
  email: string | null;
  emailDomain: string;
  displayName: string | null;
  createdAt: Date | null;
  emailVerifiedAt: Date | null;
  lastSignInAt: Date | null;

  // Activity timestamps
  lastFeedbackAt: Date | null;
  lastScoreAt: Date | null;

  // Activity checkmarks
  hasCreatedBenchmark: boolean;
  contributedBenchmarksCount: number;
  hasContributedToMultipleBenchmarks: boolean; // 4+ benchmarks including own
  hasGivenQuickFeedback: boolean;
  hasGivenScores: boolean;

  // Stats for ranking
  totalBenchmarksOwned: number;
  totalPromptsUploaded: number;
  totalFeedbackGiven: number;
  totalScoresGiven: number;

  // Organization affiliation
  organizationName: string | null;
}

export interface SignupTrend {
  date: string;
  verifiedSignups: number;
  totalSignups: number;
}

export class AdminService {
  /**
   * Get comprehensive user activity metrics for admin dashboard
   */
  static async getUserActivityMetrics(): Promise<UserActivityMetrics[]> {
    const results = await db
      .select({
        userId: authUsers.id,
        email: authUsers.email,
        emailDomain: sql<string>`SPLIT_PART(${authUsers.email}, '@', 2)`.as(
          "email_domain"
        ),
        displayName: userProfileTable.displayName,
        createdAt: authUsers.createdAt,
        emailVerifiedAt: authUsers.emailConfirmedAt,
        lastSignInAt: authUsers.lastSignInAt,

        // Last activity timestamps
        lastFeedbackAt: sql<Date | null>`MAX(${quickFeedbacksTable.createdAt})`.as(
          "last_feedback_at"
        ),
        lastScoreAt: sql<Date | null>`MAX(${scoresTable.createdAt})`.as(
          "last_score_at"
        ),

        // Benchmarks owned
        totalBenchmarksOwned: sql<number>`COUNT(DISTINCT ${promptSetsTable.id})`.as(
          "total_benchmarks_owned"
        ),

        // Prompts uploaded (via files table)
        totalPromptsUploaded: sql<number>`COUNT(DISTINCT ${promptsTable.id})`.as(
          "total_prompts_uploaded"
        ),

        // Distinct benchmarks contributed to (as uploader or collaborator)
        contributedBenchmarksCount: sql<number>`COUNT(DISTINCT COALESCE(${userRoleOnPromptSetTable.promptSetId}, ${promptSetPrompts.promptSetId}))`.as(
          "contributed_benchmarks_count"
        ),

        // Feedback counts
        totalFeedbackGiven: sql<number>`COUNT(DISTINCT ${quickFeedbacksTable.id})`.as(
          "total_feedback_given"
        ),
        totalScoresGiven: sql<number>`COUNT(DISTINCT ${scoresTable.id})`.as(
          "total_scores_given"
        ),
      })
      .from(authUsers)
      .leftJoin(userProfileTable, eq(userProfileTable.userId, authUsers.id))
      .leftJoin(promptSetsTable, eq(promptSetsTable.ownerId, authUsers.id))
      .leftJoin(filesTable, eq(filesTable.uploaderId, authUsers.id))
      .leftJoin(promptsTable, eq(promptsTable.fileId, filesTable.id))
      .leftJoin(
        promptSetPrompts,
        eq(promptSetPrompts.promptId, promptsTable.id)
      )
      .leftJoin(
        userRoleOnPromptSetTable,
        eq(userRoleOnPromptSetTable.userId, authUsers.id)
      )
      .leftJoin(quickFeedbacksTable, eq(quickFeedbacksTable.userId, authUsers.id))
      .leftJoin(
        scoresTable,
        and(
          eq(scoresTable.scorerUserId, authUsers.id),
          isNotNull(scoresTable.scorerUserId)
        )
      )
      .groupBy(
        authUsers.id,
        authUsers.email,
        authUsers.createdAt,
        authUsers.emailConfirmedAt,
        authUsers.lastSignInAt,
        userProfileTable.displayName
      )
      .orderBy(desc(authUsers.createdAt));

    // Transform results to add computed fields
    return results.map((row) => ({
      userId: row.userId,
      email: row.email,
      emailDomain: row.emailDomain,
      displayName: row.displayName,
      createdAt: row.createdAt,
      emailVerifiedAt: row.emailVerifiedAt,
      lastSignInAt: row.lastSignInAt,
      lastFeedbackAt: row.lastFeedbackAt,
      lastScoreAt: row.lastScoreAt,

      // Activity checkmarks
      hasCreatedBenchmark: row.totalBenchmarksOwned > 0,
      contributedBenchmarksCount: row.contributedBenchmarksCount,
      hasContributedToMultipleBenchmarks: row.contributedBenchmarksCount >= 4,
      hasGivenQuickFeedback: row.totalFeedbackGiven > 0,
      hasGivenScores: row.totalScoresGiven > 0,

      // Stats
      totalBenchmarksOwned: row.totalBenchmarksOwned,
      totalPromptsUploaded: row.totalPromptsUploaded,
      totalFeedbackGiven: row.totalFeedbackGiven,
      totalScoresGiven: row.totalScoresGiven,

      // Will be enriched with organization data in API layer
      organizationName: null,
    }));
  }

  /**
   * Get signup trends over time (daily aggregation)
   * @param days - Number of days to look back (default: 90)
   */
  static async getSignupTrends(days: number = 90): Promise<SignupTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`DATE(${authUsers.createdAt})`.as("date"),
        verifiedSignups: sql<number>`COUNT(*) FILTER (WHERE ${authUsers.emailConfirmedAt} IS NOT NULL)`.as(
          "verified_signups"
        ),
        totalSignups: sql<number>`COUNT(*)`.as("total_signups"),
      })
      .from(authUsers)
      .where(gte(authUsers.createdAt, startDate))
      .groupBy(sql`DATE(${authUsers.createdAt})`)
      .orderBy(sql`DATE(${authUsers.createdAt})`);

    return results.map((row) => ({
      date: row.date,
      verifiedSignups: row.verifiedSignups,
      totalSignups: row.totalSignups,
    }));
  }

  /**
   * Get weekly signup trends
   * @param weeks - Number of weeks to look back (default: 12)
   */
  static async getWeeklySignupTrends(weeks: number = 12): Promise<SignupTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const results = await db
      .select({
        date: sql<string>`DATE_TRUNC('week', ${authUsers.createdAt})::date`.as(
          "week_start"
        ),
        verifiedSignups: sql<number>`COUNT(*) FILTER (WHERE ${authUsers.emailConfirmedAt} IS NOT NULL)`.as(
          "verified_signups"
        ),
        totalSignups: sql<number>`COUNT(*)`.as("total_signups"),
      })
      .from(authUsers)
      .where(gte(authUsers.createdAt, startDate))
      .groupBy(sql`DATE_TRUNC('week', ${authUsers.createdAt})`)
      .orderBy(sql`DATE_TRUNC('week', ${authUsers.createdAt})`);

    return results.map((row) => ({
      date: row.date,
      verifiedSignups: row.verifiedSignups,
      totalSignups: row.totalSignups,
    }));
  }

  /**
   * Get recently registered users (last 30 days by default)
   */
  static async getRecentlyRegisteredUsers(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return db
      .select({
        userId: authUsers.id,
        email: authUsers.email,
        emailDomain: sql<string>`SPLIT_PART(${authUsers.email}, '@', 2)`,
        displayName: userProfileTable.displayName,
        createdAt: authUsers.createdAt,
        emailVerifiedAt: authUsers.emailConfirmedAt,
        lastSignInAt: authUsers.lastSignInAt,
      })
      .from(authUsers)
      .leftJoin(userProfileTable, eq(userProfileTable.userId, authUsers.id))
      .where(gte(authUsers.createdAt, startDate))
      .orderBy(desc(authUsers.createdAt));
  }

  /**
   * Check if a user is an admin
   * For now, we'll use a metadata field in user_profile
   */
  static async isAdmin(userId: string): Promise<boolean> {
    const result = await db
      .select({
        metadata: userProfileTable.metadata,
      })
      .from(userProfileTable)
      .where(eq(userProfileTable.userId, userId))
      .limit(1);

    if (result.length === 0 || !result[0]) {
      return false;
    }

    const metadata = result[0].metadata as any;
    return metadata?.isAdmin === true;
  }

  /**
   * Set admin status for a user
   */
  static async setAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
    const result = await db
      .select({
        metadata: userProfileTable.metadata,
      })
      .from(userProfileTable)
      .where(eq(userProfileTable.userId, userId))
      .limit(1);

    if (result.length === 0 || !result[0]) {
      throw new Error("User profile not found");
    }

    const currentMetadata = result[0].metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      isAdmin,
    };

    await db
      .update(userProfileTable)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(userProfileTable.userId, userId));
  }
}
