import {
  leaderboardView,
  modelLeaderboardPerPromptSetView,
  promptSetsTable,
  userRoleOnPromptSetTable,
} from "@/database/schema";
import {
  and,
  asc,
  desc,
  eq,
  getViewSelectedFields,
  inArray,
  isNull,
  like,
  not,
  or,
  SQL,
  sql,
} from "drizzle-orm";
import { DbOptions, DbTx } from "@/types/db";
import { withTxOrDb } from "@/database/helpers";
import { UserRoleOnPromptSet } from "@/database/types";
import { ADMIN_USER_ID } from "@/lib/constants";

export class LeaderboardService {
  private static buildLeaderboardQuery(
    tx: DbTx,
    params?: {
      requestedByUserId?: string;
      conditions?: () => (SQL<unknown> | undefined)[];
    }
  ) {
    let query = tx
      .select({
        ...getViewSelectedFields(leaderboardView),
      })
      .from(leaderboardView)
      .orderBy(
        desc(leaderboardView.avgScore),
        desc(leaderboardView.accuracy),
        desc(leaderboardView.uniquePrompts),
        desc(leaderboardView.totalTestsPerformed)
      )
      .$dynamic();
    const whereConditions: (SQL<unknown> | undefined)[] = [
      // TODO: Hide the following contexts for the time being
      and(
        not(eq(leaderboardView.context, "Machine Translation")),
        not(like(sql`LOWER(${leaderboardView.context})`, "courtlistener%"))
      ),

      ...(params?.conditions?.() || []),
    ];

    // Apply access control rules if the requested user is specified
    if (
      params?.requestedByUserId !== undefined &&
      params?.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
    ) {
      query = query
        .leftJoin(
          userRoleOnPromptSetTable,
          and(
            eq(
              userRoleOnPromptSetTable.promptSetId,
              leaderboardView.promptSetId
            ),
            eq(
              userRoleOnPromptSetTable.userId,
              params.requestedByUserId || sql`NULL`
            )
          )
        )
        .leftJoin(
          promptSetsTable,
          eq(leaderboardView.promptSetId, promptSetsTable.id)
        );

      whereConditions.push(
        or(
          // Forest AI data is always public
          isNull(leaderboardView.promptSetId),

          // Otherwise Prompt Set access control rules apply
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

    return query.where(and(...whereConditions));
  }

  static async getLeaderboardItem(
    options?: DbOptions & {
      requestedByUserId?: string;
      filters?: {
        model?: string;
        promptSetId?: number;
        protocolAddress?: string;
      };
    }
  ) {
    return withTxOrDb(async (tx) => {
      const conditions: (SQL<unknown> | undefined)[] = [];

      if (options?.filters?.model) {
        conditions.push(eq(leaderboardView.model, options.filters.model));
      }

      if (options?.filters?.promptSetId) {
        conditions.push(
          eq(leaderboardView.promptSetId, options.filters.promptSetId)
        );
      }

      if (options?.filters?.protocolAddress) {
        conditions.push(
          eq(leaderboardView.protocolAddress, options.filters.protocolAddress)
        );
      }

      const results = await this.buildLeaderboardQuery(tx, {
        requestedByUserId: options?.requestedByUserId,
        conditions: () => conditions,
      }).limit(1);

      return results[0];
    }, options?.tx);
  }

  static async getLeaderboards(
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrDb(async (tx) => {
      const entries = await this.buildLeaderboardQuery(tx, {
        requestedByUserId: options?.requestedByUserId,
      });
      const leaderboards = new Map<string, Leaderboard>();
      for (const entry of entries) {
        // Get a unique key for each leaderboard based on the Prompt type if it exists
        const key = entry.promptType
          ? `${entry.context}.${entry.promptType}`
          : entry.context;

        if (!leaderboards.has(key)) {
          leaderboards.set(key, {
            context: entry.context,
            promptSetId: entry.promptSetId,
            protocolAddress: entry.protocolAddress,
            promptType: entry.promptType,
            entries: [],
          });
        }

        const leaderboard = leaderboards.get(key)!;

        leaderboard.entries.push({
          model: entry.model,
          avgScore: entry.avgScore,
          accuracy: entry.accuracy,
          totalEvaluations: entry.totalEvaluations,
          recentEvaluation: entry.recentEvaluation,
          uniquePrompts: entry.uniquePrompts,
          totalTestsPerformed: entry.totalTestsPerformed,
        });
      }

      return Array.from(leaderboards.values());
    }, options?.tx);
  }

  static async getModelLeaderboardForPromptSet(
    options: DbOptions & {
      promptSetId: number;
      requestedByUserId?: string;
    }
  ): Promise<ModelLeaderboardItem[]> {
    return withTxOrDb(async (tx) => {
      let query = tx
        .select({
          model: modelLeaderboardPerPromptSetView.model,
          avgScore: modelLeaderboardPerPromptSetView.avgScore,
          avgResponseTime: modelLeaderboardPerPromptSetView.avgResponseTime,
          totalPromptsTested:
            modelLeaderboardPerPromptSetView.totalPromptsTested,
        })
        .from(modelLeaderboardPerPromptSetView)
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [
        eq(modelLeaderboardPerPromptSetView.promptSetId, options.promptSetId),
      ];

      if (
        options.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID
      ) {
        query = query
          .leftJoin(
            promptSetsTable,
            eq(modelLeaderboardPerPromptSetView.promptSetId, promptSetsTable.id)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            and(
              eq(
                userRoleOnPromptSetTable.promptSetId,
                modelLeaderboardPerPromptSetView.promptSetId
              ),
              eq(userRoleOnPromptSetTable.userId, options.requestedByUserId)
            )
          );

        whereConditions.push(
          or(
            // If the Prompt Set is public, then everyone can see it.
            eq(promptSetsTable.isPublic, true),

            // Otherwise check if the user has any of the following roles
            inArray(userRoleOnPromptSetTable.role, [
              UserRoleOnPromptSet.admin,
              UserRoleOnPromptSet.owner,
              UserRoleOnPromptSet.collaborator,
              UserRoleOnPromptSet.reviewer,
            ])
          )
        );
      }

      return await query
        .where(and(...whereConditions))
        .orderBy(
          desc(modelLeaderboardPerPromptSetView.avgScore),
          desc(modelLeaderboardPerPromptSetView.totalPromptsTested),
          asc(modelLeaderboardPerPromptSetView.avgResponseTime),
          asc(modelLeaderboardPerPromptSetView.model)
        );
    }, options?.tx);
  }
}

export type LeaderboardItem = {
  model: string;
  avgScore: number | null;
  accuracy: number | null;
  totalEvaluations: number;
  recentEvaluation: Date;
  uniquePrompts: number | null;
  totalTestsPerformed: number;
};

export type Leaderboard = {
  context: string;
  promptSetId: number | null;
  protocolAddress: string | null;
  promptType: string | null;
  entries: LeaderboardItem[];
};

export type ModelLeaderboardItem = {
  model: string;
  avgScore: number;
  avgResponseTime: number;
  totalPromptsTested: number;
};
