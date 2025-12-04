/**
 * ELO Computation Service
 *
 * Handles incremental ELO score computation for model rankings based on
 * pairwise comparisons of response scores to the same prompts.
 */

import { db } from "@/database/client";
import {
  responsesTable,
  scoresTable,
  promptSetPrompts,
  promptSetsTable,
  rankingComputationsTable,
  rankingModelEloTable,
} from "@/database/schema";
import { PromptStatuses } from "@/database/types";
import { and, eq, desc, sql } from "drizzle-orm";

const DEFAULT_ELO = 1500;
const K_FACTOR = 16;

interface ModelEloState {
  providerModelId: number;
  eloScore: number;
  winCount: number;
  lossCount: number;
  matchCount: number;
}

interface Match {
  promptId: string;
  modelAId: number;
  modelBId: number;
  modelAScore: number;
  modelBScore: number;
  matchDate: Date;
}

interface ComputationResult {
  success: boolean;
  matchesProcessed: number;
  modelsUpdated: number;
  newModelsAdded: number;
  computationId: number;
  elapsedMs: number;
  error?: string;
}

/**
 * Calculate the expected score for a player given their ELO and opponent's ELO
 */
function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Calculate new ELO rating after a match
 * @param currentElo - Current ELO rating
 * @param expectedScore - Expected score (0-1)
 * @param actualScore - Actual score (1 for win, 0 for loss)
 * @returns New ELO rating
 */
function calculateNewElo(
  currentElo: number,
  expected: number,
  actualScore: number
): number {
  return currentElo + K_FACTOR * (actualScore - expected);
}

export class EloService {
  /**
   * Get the cutoff date for new responses (newest created_at in ranking_model_elo)
   */
  static async getCutoffDate(): Promise<Date | null> {
    const result = await db
      .select({
        maxCreatedAt: sql<string | null>`MAX(${rankingModelEloTable.createdAt})`,
      })
      .from(rankingModelEloTable);

    const maxCreatedAt = result[0]?.maxCreatedAt;
    return maxCreatedAt ? new Date(maxCreatedAt) : null;
  }

  /**
   * Get or create the current computation record
   */
  static async getOrCreateComputation(): Promise<number> {
    // Get the latest computation
    const existing = await db
      .select({ id: rankingComputationsTable.id })
      .from(rankingComputationsTable)
      .orderBy(desc(rankingComputationsTable.computedAt))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      return existing[0].id;
    }

    // Create a new computation if none exists
    const result = await db
      .insert(rankingComputationsTable)
      .values({
        parameters: {
          source: "elo_computation",
          kFactor: K_FACTOR,
          defaultElo: DEFAULT_ELO,
          createdAt: new Date().toISOString(),
        },
      })
      .returning({ id: rankingComputationsTable.id });

    const newComputation = result[0];
    if (!newComputation) {
      throw new Error("Failed to create computation record");
    }

    return newComputation.id;
  }

  /**
   * Fetch current ELO states for all models
   */
  static async getCurrentEloStates(
    computationId: number
  ): Promise<Map<number, ModelEloState>> {
    const eloRecords = await db
      .select({
        providerModelId: rankingModelEloTable.providerModelId,
        eloScore: rankingModelEloTable.eloScore,
        winCount: rankingModelEloTable.winCount,
        lossCount: rankingModelEloTable.lossCount,
        matchCount: rankingModelEloTable.matchCount,
      })
      .from(rankingModelEloTable)
      .where(eq(rankingModelEloTable.computationId, computationId));

    const stateMap = new Map<number, ModelEloState>();
    for (const record of eloRecords) {
      stateMap.set(record.providerModelId, {
        providerModelId: record.providerModelId,
        eloScore: record.eloScore,
        winCount: record.winCount,
        lossCount: record.lossCount,
        matchCount: record.matchCount,
      });
    }

    return stateMap;
  }

  /**
   * Get or initialize ELO state for a model
   */
  static getOrInitModelState(
    stateMap: Map<number, ModelEloState>,
    providerModelId: number
  ): ModelEloState {
    let state = stateMap.get(providerModelId);
    if (!state) {
      state = {
        providerModelId,
        eloScore: DEFAULT_ELO,
        winCount: 0,
        lossCount: 0,
        matchCount: 0,
      };
      stateMap.set(providerModelId, state);
    }
    return state;
  }

  /**
   * Fetch matches directly from the database using a single SQL query.
   *
   * This query:
   * 1. Aggregates scores by (prompt_id, model_id) - averaging all scores for a model on a prompt
   * 2. Self-joins to create pairwise matches (model_a < model_b to avoid duplicates)
   * 3. Filters out ties (where scores are exactly equal)
   * 4. Orders by match date (max of the two response dates)
   *
   * Filters applied:
   * - Only responses from public prompt sets
   * - Only included prompts in prompt sets
   * - Only revealed responses
   * - At least one score per response
   * - Only responses created after cutoff date (if provided)
   */
  static async fetchMatches(cutoffDate: Date | null): Promise<Match[]> {
    // Build the cutoff condition for the CTE
    const cutoffCondition = cutoffDate
      ? sql`AND r.created_at > ${cutoffDate}`
      : sql``;

    // Single query that does everything:
    // 1. model_scores CTE: aggregate scores by (prompt_id, model_id)
    // 2. Self-join to create pairs
    // 3. Filter ties and order by date
    const result = await db.execute<{
      prompt_id: string;
      model_a_id: number;
      model_b_id: number;
      model_a_score: number;
      model_b_score: number;
      match_date: Date;
    }>(sql`
      WITH model_scores AS (
        SELECT 
          r.prompt_id,
          r.model_id,
          AVG(s.score) AS avg_score,
          MAX(r.created_at) AS max_created_at
        FROM ${responsesTable} r
        INNER JOIN ${scoresTable} s ON s.response_id = r.id
        INNER JOIN ${promptSetPrompts} psp ON psp.prompt_id = r.prompt_id
        INNER JOIN ${promptSetsTable} ps ON ps.id = psp.prompt_set_id
        WHERE 
          ps.is_public = true
          AND psp.status = ${PromptStatuses.included}
          AND r.is_revealed = true
          AND s.score IS NOT NULL
          ${cutoffCondition}
        GROUP BY r.prompt_id, r.model_id
      )
      SELECT 
        a.prompt_id,
        a.model_id AS model_a_id,
        b.model_id AS model_b_id,
        a.avg_score AS model_a_score,
        b.avg_score AS model_b_score,
        GREATEST(a.max_created_at, b.max_created_at) AS match_date
      FROM model_scores a
      INNER JOIN model_scores b 
        ON a.prompt_id = b.prompt_id 
        AND a.model_id < b.model_id
      WHERE a.avg_score != b.avg_score
      ORDER BY match_date ASC
    `);

    return result.rows.map((row) => ({
      promptId: row.prompt_id,
      modelAId: row.model_a_id,
      modelBId: row.model_b_id,
      modelAScore: row.model_a_score,
      modelBScore: row.model_b_score,
      matchDate: new Date(row.match_date),
    }));
  }

  /**
   * Process matches and update ELO states in memory
   */
  static processMatches(
    matches: Match[],
    eloStates: Map<number, ModelEloState>
  ): { processed: number } {
    let processed = 0;

    for (const match of matches) {
      const stateA = this.getOrInitModelState(eloStates, match.modelAId);
      const stateB = this.getOrInitModelState(eloStates, match.modelBId);

      // Determine winner
      const modelAWins = match.modelAScore > match.modelBScore;

      // Calculate expected scores
      const expectedA = expectedScore(stateA.eloScore, stateB.eloScore);
      const expectedB = expectedScore(stateB.eloScore, stateA.eloScore);

      // Update ELO ratings
      stateA.eloScore = calculateNewElo(
        stateA.eloScore,
        expectedA,
        modelAWins ? 1 : 0
      );
      stateB.eloScore = calculateNewElo(
        stateB.eloScore,
        expectedB,
        modelAWins ? 0 : 1
      );

      // Update win/loss/match counts
      stateA.matchCount++;
      stateB.matchCount++;

      if (modelAWins) {
        stateA.winCount++;
        stateB.lossCount++;
      } else {
        stateB.winCount++;
        stateA.lossCount++;
      }

      processed++;
    }

    return { processed };
  }

  /**
   * Save updated ELO states to the database
   */
  static async saveEloStates(
    computationId: number,
    eloStates: Map<number, ModelEloState>,
    existingModelIds: Set<number>
  ): Promise<{ updated: number; inserted: number }> {
    let updated = 0;
    let inserted = 0;

    const now = new Date();

    for (const [providerModelId, state] of eloStates) {
      if (existingModelIds.has(providerModelId)) {
        // Update existing record
        await db
          .update(rankingModelEloTable)
          .set({
            eloScore: state.eloScore,
            winCount: state.winCount,
            lossCount: state.lossCount,
            matchCount: state.matchCount,
            createdAt: now,
          })
          .where(
            and(
              eq(rankingModelEloTable.computationId, computationId),
              eq(rankingModelEloTable.providerModelId, providerModelId)
            )
          );
        updated++;
      } else {
        // Insert new record
        await db.insert(rankingModelEloTable).values({
          computationId,
          providerModelId: state.providerModelId,
          eloScore: state.eloScore,
          winCount: state.winCount,
          lossCount: state.lossCount,
          matchCount: state.matchCount,
          createdAt: now,
        });
        inserted++;
      }
    }

    return { updated, inserted };
  }

  /**
   * Main entry point: Compute ELO scores incrementally
   */
  static async computeElo(): Promise<ComputationResult> {
    const startTime = Date.now();

    try {
      // Step 1: Get cutoff date
      const cutoffDate = await this.getCutoffDate();
      console.log(
        `[ELO] Cutoff date: ${cutoffDate?.toISOString() ?? "None (full computation)"}`
      );

      // Step 2: Get or create computation record
      const computationId = await this.getOrCreateComputation();
      console.log(`[ELO] Using computation ID: ${computationId}`);

      // Step 3: Load current ELO states
      const eloStates = await this.getCurrentEloStates(computationId);
      const existingModelIds = new Set(eloStates.keys());
      console.log(`[ELO] Loaded ${eloStates.size} existing model ELO states`);

      // Step 4: Fetch matches directly from SQL (aggregation, pairing, filtering ties)
      const matches = await this.fetchMatches(cutoffDate);
      console.log(`[ELO] Fetched ${matches.length} matches from database`);

      if (matches.length === 0) {
        return {
          success: true,
          matchesProcessed: 0,
          modelsUpdated: 0,
          newModelsAdded: 0,
          computationId,
          elapsedMs: Date.now() - startTime,
        };
      }

      // Step 5: Process matches in memory (ELO calculation must be sequential)
      const { processed } = this.processMatches(matches, eloStates);
      console.log(`[ELO] Processed ${processed} matches`);

      // Step 6: Save updated states
      const { updated, inserted } = await this.saveEloStates(
        computationId,
        eloStates,
        existingModelIds
      );
      console.log(`[ELO] Updated ${updated} models, inserted ${inserted} new`);

      const elapsedMs = Date.now() - startTime;
      console.log(`[ELO] Computation completed in ${elapsedMs}ms`);

      return {
        success: true,
        matchesProcessed: processed,
        modelsUpdated: updated,
        newModelsAdded: inserted,
        computationId,
        elapsedMs,
      };
    } catch (error) {
      console.error("[ELO] Error during computation:", error);
      return {
        success: false,
        matchesProcessed: 0,
        modelsUpdated: 0,
        newModelsAdded: 0,
        computationId: 0,
        elapsedMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
