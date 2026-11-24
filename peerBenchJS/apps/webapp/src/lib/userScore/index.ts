/**
 * User Score System
 *
 * Comprehensive user contribution scoring
 */

export * from './types';
export * from './scoring';
export * from './stats';
export * from './data-fetcher';

import type {
  UserScoreInputData,
  UserScoreConfig,
  UserScoreResults,
} from './types';
import { calculateUserScores } from './scoring';
import { calculateUserScoreStats, formatUserScoreStats } from './stats';

/**
 * Main calculation function for user scores
 */
export function calculateUserScoreResults(
  data: UserScoreInputData,
  config: UserScoreConfig
): UserScoreResults {
  console.log('Calculating user scores...');

  const scores = calculateUserScores(data, config);
  const stats = calculateUserScoreStats(scores, data);

  console.log(formatUserScoreStats(stats));
  console.log(`Top 5 users:`);
  scores.slice(0, 5).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.displayName}: ${s.totalScore.toFixed(2)} points`);
  });

  return {
    scores,
    config,
    calculatedAt: new Date(),
    stats,
  };
}

/**
 * Export results as JSON
 */
export function exportUserScoreResultsAsJSON(results: UserScoreResults): string {
  return JSON.stringify(results, null, 2);
}

/**
 * Download results as JSON file
 */
export function downloadUserScoreResultsAsJSON(
  results: UserScoreResults,
  filename: string = 'user-scores.json'
): void {
  const json = exportUserScoreResultsAsJSON(results);
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
