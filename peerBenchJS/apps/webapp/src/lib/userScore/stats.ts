/**
 * User Score Statistics Calculator
 */

import type { UserScoreEntry, UserScoreStats, UserScoreInputData } from './types';

/**
 * Calculate statistics about user scores
 */
export function calculateUserScoreStats(
  scores: UserScoreEntry[],
  inputData: UserScoreInputData
): UserScoreStats {
  const totalUsers = scores.length;
  const usersWithScore = scores.filter((s) => s.totalScore > 0).length;

  // Calculate average and median
  const scoreTotals = scores.map((s) => s.totalScore);
  const averageScore =
    scoreTotals.length > 0
      ? scoreTotals.reduce((a, b) => a + b, 0) / scoreTotals.length
      : 0;

  const sortedScores = [...scoreTotals].sort((a, b) => a - b);
  const medianScore =
    sortedScores.length > 0
      ? sortedScores[Math.floor(sortedScores.length / 2)]!
      : 0;

  // Top 10 percentile
  const top10Index = Math.floor(sortedScores.length * 0.9);
  const top10PercentileScore =
    sortedScores.length > 0 ? sortedScores[top10Index]! : 0;

  // Distribution
  const scoresDistribution = calculateDistribution(scoreTotals);

  // Activity stats
  const totalPrompts = inputData.prompts.length;
  const totalFeedbacks = inputData.feedbacks.length;
  const totalBenchmarks = inputData.benchmarks.length;

  const averagePromptsPerUser =
    totalUsers > 0 ? totalPrompts / totalUsers : 0;
  const averageFeedbacksPerUser =
    totalUsers > 0 ? totalFeedbacks / totalUsers : 0;

  return {
    totalUsers,
    usersWithScore,
    averageScore,
    medianScore,
    top10PercentileScore,
    scoresDistribution,
    totalPrompts,
    totalFeedbacks,
    totalBenchmarks,
    averagePromptsPerUser,
    averageFeedbacksPerUser,
  };
}

/**
 * Calculate score distribution buckets
 */
function calculateDistribution(
  scores: number[]
): { range: string; count: number }[] {
  const buckets = [
    { range: '0', min: 0, max: 0, count: 0 },
    { range: '1-50', min: 1, max: 50, count: 0 },
    { range: '51-100', min: 51, max: 100, count: 0 },
    { range: '101-200', min: 101, max: 200, count: 0 },
    { range: '201-500', min: 201, max: 500, count: 0 },
    { range: '501-1000', min: 501, max: 1000, count: 0 },
    { range: '1000+', min: 1001, max: Infinity, count: 0 },
  ];

  for (const score of scores) {
    for (const bucket of buckets) {
      if (score >= bucket.min && score <= bucket.max) {
        bucket.count++;
        break;
      }
    }
  }

  return buckets.map((b) => ({ range: b.range, count: b.count }));
}

/**
 * Format stats for console output
 */
export function formatUserScoreStats(stats: UserScoreStats): string {
  return `
═══════════════════════════════════════════════════════════
                 USER SCORE STATISTICS
═══════════════════════════════════════════════════════════

USERS
  Total Users:              ${stats.totalUsers}
  Users with Score > 0:     ${stats.usersWithScore} (${((stats.usersWithScore / stats.totalUsers) * 100).toFixed(1)}%)
  Average Score:            ${stats.averageScore.toFixed(2)}
  Median Score:             ${stats.medianScore.toFixed(2)}
  Top 10% Threshold:        ${stats.top10PercentileScore.toFixed(2)}

ACTIVITY
  Total Prompts:            ${stats.totalPrompts}
  Total Feedbacks:          ${stats.totalFeedbacks}
  Total Benchmarks:         ${stats.totalBenchmarks}
  Avg Prompts/User:         ${stats.averagePromptsPerUser.toFixed(2)}
  Avg Feedbacks/User:       ${stats.averageFeedbacksPerUser.toFixed(2)}

SCORE DISTRIBUTION
${stats.scoresDistribution
  .map(
    (d) =>
      `  ${d.range.padEnd(12)}  ${d.count.toString().padStart(5)} users (${((d.count / stats.totalUsers) * 100).toFixed(1)}%)`
  )
  .join('\n')}

═══════════════════════════════════════════════════════════
  `.trim();
}
