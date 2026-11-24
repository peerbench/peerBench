/**
 * Leaderboard Calculation System
 *
 * Main orchestrator that ties together all scoring, simulation, and stats.
 */

export * from './types';
export * from './contributor-scoring';
export * from './reviewer-scoring';
export * from './stats';
export * from './data-fetcher';

// Re-export simulation from the new /sim module (client-safe)
export { runSimpleSimulation } from '@/sim/client';
export type { SimpleSimulationConfig as SimulationConfig } from '@/sim/types';

import type {
  InputData,
  AllCoefficients,
  LeaderboardResults,
  SimulatedData,
} from './types';
import { calculateContributorScores } from './contributor-scoring';
import { calculateReviewerScores } from './reviewer-scoring';
import { calculateStats, formatStatsForConsole } from './stats';

/**
 * Main calculation function that computes both leaderboards
 */
export function calculateLeaderboards(
  data: InputData | SimulatedData,
  coefficients: AllCoefficients
): LeaderboardResults {
  console.log('Starting leaderboard calculations...');

  // Calculate contributor scores
  const contributorLeaderboard = calculateContributorScores(
    data,
    coefficients.contributor
  );

  // Calculate reviewer scores
  const reviewerLeaderboard = calculateReviewerScores(
    data,
    coefficients.reviewer
  );

  // Calculate statistics
  const stats = calculateStats(data);

  // Log stats to console for debugging
  console.log(formatStatsForConsole(stats));

  const results: LeaderboardResults = {
    contributorLeaderboard,
    reviewerLeaderboard,
    stats,
    calculatedAt: new Date(),
    coefficients,
  };

  console.log('Leaderboard calculations complete!');
  console.log(`- ${contributorLeaderboard.length} contributors ranked`);
  console.log(`- ${reviewerLeaderboard.length} reviewers ranked`);

  return results;
}

/**
 * Export results as JSON for download
 */
export function exportResultsAsJSON(results: LeaderboardResults): string {
  return JSON.stringify(results, null, 2);
}

/**
 * Download results as JSON file
 */
export function downloadResultsAsJSON(results: LeaderboardResults, filename: string = 'leaderboard-results.json'): void {
  const json = exportResultsAsJSON(results);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
