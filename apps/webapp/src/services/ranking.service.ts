/**
 * Ranking Computation Service
 *
 * Handles all ranking computations including:
 * - Trust propagation and quality rankings (via SQL function)
 * - ELO score computation for model rankings
 */

import { db } from "@/database/client";
import {
  responsesTable,
  scoresTable,
  promptSetPrompts,
  promptSetsTable,
  rankingComputationsTable,
  rankingModelEloTable,
  rankingPromptQualityTable,
} from "@/database/schema";
import { PromptStatuses } from "@/database/types";
import { eq, desc, sql, inArray } from "drizzle-orm";

const DEFAULT_ELO = 1500;
const K_FACTOR = 1;

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

interface EloComputationResult {
  matchesProcessed: number;
  modelsUpdated: number;
  newModelsAdded: number;
}

interface ComputationResult {
  success: boolean;
  computationId: number;
  elapsedMs: number;
  trustRankingsComputed: boolean;
  eloMatchesProcessed: number;
  eloModelsUpdated: number;
  eloNewModelsAdded: number;
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

export class RankingService {
  /**
   * Get the latest computation ID from ranking_computations table
   */
  static async getLatestComputationId(): Promise<number | null> {
    console.log("[RANKING:getLatestComputationId] Querying max computation_id...");
    
    const result = await db
      .select({
        maxId: sql<number | null>`MAX(${rankingComputationsTable.id})`,
      })
      .from(rankingComputationsTable);

    const maxId = result[0]?.maxId ?? null;
    console.log(`[RANKING:getLatestComputationId] Latest computation ID: ${maxId ?? "null"}`);
    
    return maxId;
  }

  /**
   * Get the cutoff date for new responses (newest created_at in ranking_model_elo)
   */
  static async getCutoffDate(): Promise<Date | null> {
    console.log("[RANKING:getCutoffDate] Querying max created_at from ranking_model_elo...");
    
    const result = await db
      .select({
        maxCreatedAt: sql<string | null>`MAX(${rankingModelEloTable.createdAt})`,
      })
      .from(rankingModelEloTable);

    const maxCreatedAt = result[0]?.maxCreatedAt;
    console.log(`[RANKING:getCutoffDate] Raw result: ${JSON.stringify(result[0])}`);
    
    const cutoffDate = maxCreatedAt ? new Date(maxCreatedAt) : null;
    console.log(`[RANKING:getCutoffDate] Parsed cutoff date: ${cutoffDate?.toISOString() ?? "null"}`);
    
    return cutoffDate;
  }

  /**
   * Extract unique model IDs from matches
   */
  static extractModelIdsFromMatches(matches: Match[]): Set<number> {
    const modelIds = new Set<number>();
    for (const match of matches) {
      modelIds.add(match.modelAId);
      modelIds.add(match.modelBId);
    }
    return modelIds;
  }

  /**
   * Fetch current ELO states only for models involved in matches.
   * Gets the newest ELO record for each model (across all computations).
   */
  static async getCurrentEloStates(
    modelIds: Set<number>
  ): Promise<Map<number, ModelEloState>> {
    if (modelIds.size === 0) {
      console.log(`[RANKING:getCurrentEloStates] No model IDs provided, returning empty map`);
      return new Map();
    }

    console.log(`[RANKING:getCurrentEloStates] Fetching newest ELO states for ${modelIds.size} models`);
    
    const modelIdArray = Array.from(modelIds);
    
    // Use DISTINCT ON to get the newest ELO record for each model
    // Build IN clause with sql.join for proper array handling
    const modelIdList = sql.join(modelIdArray.map(id => sql`${id}`), sql`, `);
    
    const eloRecords = await db.execute<{
      provider_model_id: number;
      elo_score: number;
      win_count: number;
      loss_count: number;
      match_count: number;
    }>(sql`
      SELECT DISTINCT ON (provider_model_id)
        provider_model_id,
        elo_score,
        win_count,
        loss_count,
        match_count
      FROM ${rankingModelEloTable}
      WHERE provider_model_id IN (${modelIdList})
      ORDER BY provider_model_id, created_at DESC
    `);

    console.log(`[RANKING:getCurrentEloStates] Found ${eloRecords.rows.length} existing ELO records`);

    const stateMap = new Map<number, ModelEloState>();
    for (const record of eloRecords.rows) {
      console.log(`[RANKING:getCurrentEloStates] Record: ${JSON.stringify(record)}`);
      stateMap.set(record.provider_model_id, {
        providerModelId: record.provider_model_id,
        eloScore: record.elo_score,
        winCount: record.win_count,
        lossCount: record.loss_count,
        matchCount: record.match_count,
      });
    }

    // Log some sample ELO states
    if (eloRecords.rows.length > 0) {
      const sample = eloRecords.rows.slice(0, 3);
      console.log(`[RANKING:getCurrentEloStates] Sample ELO states:`);
      for (const s of sample) {
        console.log(`  - Model ${s.provider_model_id}: ELO=${s.elo_score.toFixed(1)}, W=${s.win_count}, L=${s.loss_count}, M=${s.match_count}`);
      }
      if (eloRecords.rows.length > 3) {
        console.log(`  ... and ${eloRecords.rows.length - 3} more`);
      }
    }

    // Log models that will be initialized with default ELO
    const newModels = modelIdArray.filter(id => !stateMap.has(id));
    if (newModels.length > 0) {
      console.log(`[RANKING:getCurrentEloStates] ${newModels.length} models have no existing ELO (will use default ${DEFAULT_ELO})`);
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
  static async fetchMatches(computationId: number, cutoffDate: Date | null): Promise<Match[]> {
    console.log(`[RANKING:fetchMatches] Fetching matches with cutoff: ${cutoffDate?.toISOString() ?? "none"}`);
    
    // Build the cutoff condition for the CTE
    const cutoffCondition = cutoffDate
      ? sql`AND r.created_at > ${cutoffDate}`
      : sql``;

    // First, let's get some debug stats
    const debugStats = await db.execute<{
      total_responses: number;
      responses_with_scores: number;
      public_prompt_sets: number;
      unique_prompts: number;
      unique_models: number;
    }>(sql`
      SELECT 
        (SELECT COUNT(*) FROM ${responsesTable}) as total_responses,
        (SELECT COUNT(DISTINCT r.id) FROM ${responsesTable} r 
         INNER JOIN ${scoresTable} s ON s.response_id = r.id
         WHERE r.is_revealed = true ${cutoffCondition}) as responses_with_scores,
        (SELECT COUNT(*) FROM ${promptSetsTable} WHERE is_public = true) as public_prompt_sets,
        (SELECT COUNT(DISTINCT r.prompt_id) FROM ${responsesTable} r
         INNER JOIN ${scoresTable} s ON s.response_id = r.id
         INNER JOIN ${promptSetPrompts} psp ON psp.prompt_id = r.prompt_id
         INNER JOIN ${promptSetsTable} ps ON ps.id = psp.prompt_set_id
         WHERE ps.is_public = true AND psp.status = ${PromptStatuses.included}
         AND r.is_revealed = true ${cutoffCondition}) as unique_prompts,
        (SELECT COUNT(DISTINCT r.model_id) FROM ${responsesTable} r
         INNER JOIN ${scoresTable} s ON s.response_id = r.id
         INNER JOIN ${promptSetPrompts} psp ON psp.prompt_id = r.prompt_id
         INNER JOIN ${promptSetsTable} ps ON ps.id = psp.prompt_set_id
         WHERE ps.is_public = true AND psp.status = ${PromptStatuses.included}
         AND r.is_revealed = true ${cutoffCondition}) as unique_models
    `);
    
    const stats = debugStats.rows[0];
    console.log(`[RANKING:fetchMatches] Debug stats:`);
    console.log(`  - Total responses in DB: ${stats?.total_responses ?? 'N/A'}`);
    console.log(`  - Responses with scores (after cutoff): ${stats?.responses_with_scores ?? 'N/A'}`);
    console.log(`  - Public prompt sets: ${stats?.public_prompt_sets ?? 'N/A'}`);
    console.log(`  - Unique prompts (filtered): ${stats?.unique_prompts ?? 'N/A'}`);
    console.log(`  - Unique models (filtered): ${stats?.unique_models ?? 'N/A'}`);

    // Single query that does everything:
    // 1. model_scores CTE: aggregate scores by (prompt_id, model_id)
    // 2. Self-join to create pairs
    // 3. Filter ties and order by date
    console.log(`[RANKING:fetchMatches] Executing main match query...`);
    
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
        INNER JOIN ${rankingPromptQualityTable} rpq ON rpq.prompt_id = r.prompt_id AND rpq.computation_id = ${computationId} AND rpq.quality_score >= 0.5
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

    console.log(`[RANKING:fetchMatches] Query returned ${result.rows.length} matches`);

    // Log some sample matches
    if (result.rows.length > 0) {
      const sample = result.rows.slice(0, 3);
      console.log(`[RANKING:fetchMatches] Sample matches:`);
      for (const m of sample) {
        console.log(`  - Prompt ${m.prompt_id.slice(0, 8)}...: Model ${m.model_a_id} (${m.model_a_score.toFixed(2)}) vs Model ${m.model_b_id} (${m.model_b_score.toFixed(2)})`);
      }
      if (result.rows.length > 3) {
        console.log(`  ... and ${result.rows.length - 3} more matches`);
      }
      
      // Log date range
      const firstDate = new Date(result.rows[0]!.match_date);
      const lastDate = new Date(result.rows[result.rows.length - 1]!.match_date);
      console.log(`[RANKING:fetchMatches] Match date range: ${firstDate.toISOString()} to ${lastDate.toISOString()}`);
    }

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
    console.log(`[RANKING:processMatches] Processing ${matches.length} matches...`);
    console.log(`[RANKING:processMatches] Initial ELO states count: ${eloStates.size}`);
    
    let processed = 0;
    let newModelsCreated = 0;
    const eloChanges: { modelId: number; before: number; after: number }[] = [];

    for (const match of matches) {
      const stateAExisted = eloStates.has(match.modelAId);
      const stateBExisted = eloStates.has(match.modelBId);
      
      const stateA = this.getOrInitModelState(eloStates, match.modelAId);
      const stateB = this.getOrInitModelState(eloStates, match.modelBId);

      if (!stateAExisted) newModelsCreated++;
      if (!stateBExisted) newModelsCreated++;

      const beforeA = stateA.eloScore;
      const beforeB = stateB.eloScore;

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

      // Track significant ELO changes for logging
      if (processed < 5) {
        eloChanges.push(
          { modelId: match.modelAId, before: beforeA, after: stateA.eloScore },
          { modelId: match.modelBId, before: beforeB, after: stateB.eloScore }
        );
      }

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

    console.log(`[RANKING:processMatches] Processed ${processed} matches`);
    console.log(`[RANKING:processMatches] New models initialized: ${newModelsCreated}`);
    console.log(`[RANKING:processMatches] Final ELO states count: ${eloStates.size}`);
    
    // Log sample ELO changes
    if (eloChanges.length > 0) {
      console.log(`[RANKING:processMatches] Sample ELO changes (first few matches):`);
      for (const change of eloChanges.slice(0, 6)) {
        const delta = change.after - change.before;
        console.log(`  - Model ${change.modelId}: ${change.before.toFixed(1)} → ${change.after.toFixed(1)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`);
      }
    }

    // Log final ELO distribution
    const allElos = Array.from(eloStates.values()).map(s => s.eloScore);
    if (allElos.length > 0) {
      const minElo = Math.min(...allElos);
      const maxElo = Math.max(...allElos);
      const avgElo = allElos.reduce((a, b) => a + b, 0) / allElos.length;
      console.log(`[RANKING:processMatches] Final ELO distribution: min=${minElo.toFixed(1)}, max=${maxElo.toFixed(1)}, avg=${avgElo.toFixed(1)}`);
    }

    return { processed };
  }

  /**
   * Save updated ELO states to the database using ON CONFLICT UPDATE
   */
  static async saveEloStates(
    computationId: number,
    eloStates: Map<number, ModelEloState>
  ): Promise<{ updated: number; inserted: number }> {
    console.log(`[RANKING:saveEloStates] Saving ${eloStates.size} ELO states to computation ${computationId} using UPSERT`);
    
    let updated = 0;
    let inserted = 0;

    const now = new Date();
    console.log(`[RANKING:saveEloStates] Using timestamp: ${now.toISOString()}`);

    for (const [, state] of eloStates) {
      // Use ON CONFLICT DO UPDATE for upsert behavior
      const result = await db
        .insert(rankingModelEloTable)
        .values({
          computationId,
          providerModelId: state.providerModelId,
          eloScore: state.eloScore,
          winCount: state.winCount,
          lossCount: state.lossCount,
          matchCount: state.matchCount,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: [rankingModelEloTable.computationId, rankingModelEloTable.providerModelId],
          set: {
            eloScore: state.eloScore,
            winCount: state.winCount,
            lossCount: state.lossCount,
            matchCount: state.matchCount,
            createdAt: now,
          },
        })
        .returning({ id: rankingModelEloTable.id });
      
      // We can't easily distinguish insert vs update with onConflictDoUpdate
      // but we can count total operations
      if (result.length > 0) {
        // Check if this was an existing record
        const existingCheck = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(rankingModelEloTable)
          .where(eq(rankingModelEloTable.id, result[0]!.id));
        
        // Since we always get a result, we'll track based on whether the state existed before
        inserted++;
      }
      
      // Log progress every 100 models
      const total = updated + inserted;
      if (total % 100 === 0) {
        console.log(`[RANKING:saveEloStates] Progress: ${total}/${eloStates.size}`);
      }
    }

    console.log(`[RANKING:saveEloStates] Complete: ${eloStates.size} records upserted`);
    return { updated: 0, inserted: eloStates.size };
  }

  /**
   * Run the SQL compute_rankings function
   */
  static async computeTrustRankings(): Promise<{ success: boolean; computationId: number | null; error?: string }> {
    console.log("\n[RANKING] === Running SQL compute_rankings function ===");
    
    try {
      // Check if the function exists
      const functionCheck = await db.execute<{ exists: boolean }>(sql`
        SELECT EXISTS (
          SELECT 1 
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE p.proname = 'compute_rankings'
          AND n.nspname = 'public'
        ) as exists
      `);

      if (!functionCheck.rows[0]?.exists) {
        console.log("[RANKING] compute_rankings function does not exist, skipping trust rankings");
        return { success: true, computationId: null };
      }

      console.log("[RANKING] Calling compute_rankings()...");
      const result = await db.execute<{ compute_rankings: number }>(sql`
        SELECT compute_rankings() as compute_rankings
      `);

      const computationId = result.rows[0]?.compute_rankings;
      console.log(`[RANKING] compute_rankings completed with computation ID: ${computationId}`);
      
      return { success: true, computationId: computationId ?? null };
    } catch (error) {
      console.error("[RANKING] Error running compute_rankings:", error);
      return { 
        success: false, 
        computationId: null, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Compute ELO scores using the latest computation ID
   */
  static async computeElo(): Promise<EloComputationResult & { computationId: number }> {
    console.log("\n[RANKING] === Computing ELO scores ===");
    
    // Step 1: Get the latest computation ID
    const computationId = await this.getLatestComputationId();
    
    if (!computationId) {
      throw new Error("No computation found in ranking_computations table. Run trust rankings first.");
    }
    
    console.log(`[RANKING] Using computation ID: ${computationId}`);

    // Step 2: Get cutoff date for incremental processing
    const cutoffDate = await this.getCutoffDate();
    console.log(`[RANKING] Cutoff date: ${cutoffDate?.toISOString() ?? "None (full computation)"}`);

    // Step 3: Fetch matches FIRST to know which models are involved
    const matches = await this.fetchMatches(computationId, cutoffDate);
    console.log(`[RANKING] Fetched ${matches.length} matches from database`);

    if (matches.length === 0) {
      console.log("[RANKING] No matches to process");
      return {
        matchesProcessed: 0,
        modelsUpdated: 0,
        newModelsAdded: 0,
        computationId,
      };
    }

    // Step 4: Extract model IDs from matches
    const modelIds = this.extractModelIdsFromMatches(matches);
    console.log(`[RANKING] Found ${modelIds.size} unique models in matches`);

    // Step 5: Load current ELO states only for models in matches (newest ELO for each)
    const eloStates = await this.getCurrentEloStates(modelIds);
    const existingModelsCount = eloStates.size;
    const newModelsCount = modelIds.size - existingModelsCount;
    console.log(`[RANKING] Loaded ${existingModelsCount} existing model ELO states, ${newModelsCount} will be new`);

    // Step 6: Process matches
    const { processed } = this.processMatches(matches, eloStates);
    console.log(`[RANKING] Processed ${processed} matches`);

    // Step 7: Save updated states with upsert
    const { inserted } = await this.saveEloStates(computationId, eloStates);
    console.log(`[RANKING] Saved ${inserted} ELO records`);

    return {
      matchesProcessed: processed,
      modelsUpdated: inserted,
      newModelsAdded: newModelsCount,
      computationId,
    };
  }

  /**
   * Main entry point: Compute all rankings (trust + ELO)
   */
  static async computeAllRankings(): Promise<ComputationResult> {
    const startTime = Date.now();

    console.log("\n" + "=".repeat(60));
    console.log("[RANKING] STARTING FULL RANKING COMPUTATION");
    console.log("=".repeat(60));
    console.log(`[RANKING] K-Factor: ${K_FACTOR}, Default ELO: ${DEFAULT_ELO}`);
    console.log(`[RANKING] Start time: ${new Date().toISOString()}`);

    try {
      // Step 1: Run SQL compute_rankings function first
      console.log("\n[RANKING] === STEP 1: Compute Trust Rankings (SQL) ===");
      const trustResult = await this.computeTrustRankings();
      
      if (!trustResult.success) {
        throw new Error(`Trust rankings failed: ${trustResult.error}`);
      }

      const computationId = trustResult.computationId ?? await this.getLatestComputationId();
      
      if (!computationId) {
        throw new Error("No computation ID available after trust rankings");
      }

      console.log(`[RANKING] Trust rankings completed. Computation ID: ${computationId}`);

      // Step 2: Run ELO computation
      console.log("\n[RANKING] === STEP 2: Compute ELO Rankings ===");
      const eloResult = await this.computeElo();

      const elapsedMs = Date.now() - startTime;
      
      console.log("\n" + "=".repeat(60));
      console.log("[RANKING] COMPUTATION COMPLETE");
      console.log("=".repeat(60));
      console.log(`[RANKING] Computation ID: ${computationId}`);
      console.log(`[RANKING] Trust rankings: ${trustResult.computationId ? 'computed' : 'skipped (function not found)'}`);
      console.log(`[RANKING] ELO matches processed: ${eloResult.matchesProcessed}`);
      console.log(`[RANKING] ELO models updated: ${eloResult.modelsUpdated}`);
      console.log(`[RANKING] Total time: ${elapsedMs}ms`);
      console.log("=".repeat(60) + "\n");

      return {
        success: true,
        computationId,
        elapsedMs,
        trustRankingsComputed: trustResult.computationId !== null,
        eloMatchesProcessed: eloResult.matchesProcessed,
        eloModelsUpdated: eloResult.modelsUpdated,
        eloNewModelsAdded: eloResult.newModelsAdded,
      };
    } catch (error) {
      console.error("\n[RANKING] !!! ERROR DURING COMPUTATION !!!");
      console.error("[RANKING] Error:", error);
      console.error("=".repeat(60) + "\n");
      return {
        success: false,
        computationId: 0,
        elapsedMs: Date.now() - startTime,
        trustRankingsComputed: false,
        eloMatchesProcessed: 0,
        eloModelsUpdated: 0,
        eloNewModelsAdded: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

