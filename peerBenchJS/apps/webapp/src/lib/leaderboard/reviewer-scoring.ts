/**
 * Reviewer Scoring Algorithm
 *
 * Based on PeerBench paper formula:
 * ReviewerScore(r) = Pearson({q_r(i)}, {q̄(i)})
 *
 * where:
 * - q_r(i) = reviewer r's rating for prompt i
 * - q̄(i) = consensus quality score for prompt i (weighted average excluding reviewer r)
 *
 * Pearson correlation measures how well a reviewer's opinions align with consensus.
 */

import type {
  InputData,
  ReviewerCoefficients,
  ReviewerLeaderboardEntry,
} from './types';

/**
 * Calculate reviewer leaderboard scores
 */
export function calculateReviewerScores(
  data: InputData,
  coefficients: ReviewerCoefficients
): ReviewerLeaderboardEntry[] {
  const { prompts, feedbacks, users } = data;

  // Group feedbacks by promptId
  const feedbacksByPrompt = groupBy(feedbacks, 'promptId');

  // Filter to only prompts with at least 3 reviews (needed for consensus)
  const qualifyingPrompts = prompts.filter(
    (p) => (feedbacksByPrompt.get(p.id)?.length || 0) >= 3
  );

  // Group feedbacks by reviewerId
  const feedbacksByReviewer = groupBy(feedbacks, 'userId');

  const scores: ReviewerLeaderboardEntry[] = [];

  for (const user of users) {
    const userFeedbacks = feedbacksByReviewer.get(user.id) || [];

    // Filter to only qualifying prompts (with ≥3 reviews)
    const qualifyingFeedbacks = userFeedbacks.filter((f) =>
      qualifyingPrompts.some((p) => p.id === f.promptId)
    );

    if (qualifyingFeedbacks.length < coefficients.minReviewsRequired) {
      continue; // Skip reviewers with too few reviews
    }

    // Calculate Pearson correlation between reviewer's scores and consensus
    const reviewerScores: number[] = [];
    const consensusScores: number[] = [];

    for (const feedback of qualifyingFeedbacks) {
      const promptFeedbacks = feedbacksByPrompt.get(feedback.promptId) || [];

      // Exclude this reviewer's feedback from consensus calculation
      const otherFeedbacks = promptFeedbacks.filter(
        (f) => f.userId !== user.id
      );

      if (otherFeedbacks.length < 2) {
        continue; // Need at least 2 other reviewers for meaningful consensus
      }

      // Calculate consensus (simple average of other reviewers)
      const consensusSum = otherFeedbacks.reduce(
        (sum, f) => sum + (f.opinion === 'positive' ? 1 : -1),
        0
      );
      const consensus = consensusSum / otherFeedbacks.length;

      // This reviewer's score
      const reviewerScore = feedback.opinion === 'positive' ? 1 : -1;

      reviewerScores.push(reviewerScore);
      consensusScores.push(consensus);
    }

    // Need at least minReviewsRequired valid comparisons
    if (reviewerScores.length < coefficients.minReviewsRequired) {
      continue;
    }

    // Calculate Pearson correlation
    const pearson = calculatePearsonCorrelation(reviewerScores, consensusScores);

    scores.push({
      userId: user.id,
      displayName: user.displayName,
      pearsonCorrelation: pearson,
      totalScore: pearson,
      reviewCount: qualifyingFeedbacks.length,
      consensusAlignment: pearson,
    });
  }

  // Sort by Pearson correlation descending
  return scores.sort((a, b) => b.pearsonCorrelation - a.pearsonCorrelation);
}

/**
 * Calculate Pearson correlation coefficient
 *
 * Formula:
 * r = Σ((x_i - x̄)(y_i - ȳ)) / sqrt(Σ(x_i - x̄)² * Σ(y_i - ȳ)²)
 *
 * Returns a value between -1 and 1:
 * - 1 = perfect positive correlation (reviewer always agrees with consensus)
 * - 0 = no correlation (reviewer is random)
 * - -1 = perfect negative correlation (reviewer always disagrees with consensus)
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) {
    return 0;
  }

  const n = x.length;

  // Calculate means
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  // Calculate correlation components
  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i]! - meanX;
    const dy = y[i]! - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }

  // Calculate Pearson correlation
  const denominator = Math.sqrt(sumSqX * sumSqY);

  // Avoid division by zero
  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

/**
 * Utility: Group array of objects by a key
 */
function groupBy<T>(array: T[], key: keyof T): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of array) {
    const keyValue = String(item[key]);
    const group = map.get(keyValue) || [];
    group.push(item);
    map.set(keyValue, group);
  }

  return map;
}
