/**
 * Contributor Scoring Algorithm
 *
 * Based on PeerBench paper formula:
 * ContributorScore(c) = Σ quality(T_i(c)) + bonuses
 *
 * Adapted for our system:
 * - quality(T) = weighted average of reviews (positive=+1, negative=-1)
 * - bonuses = affiliation points if user has org_to_people entry
 * - All calculations happen client-side
 */

import type {
  InputData,
  ContributorCoefficients,
  ContributorLeaderboardEntry,
  Feedback,
} from './types';

/**
 * Calculate contributor leaderboard scores
 */
export function calculateContributorScores(
  data: InputData,
  coefficients: ContributorCoefficients
): ContributorLeaderboardEntry[] {
  const { prompts, feedbacks, users } = data;

  // Group feedbacks by promptId for efficient lookup
  const feedbacksByPrompt = groupBy(feedbacks, 'promptId');

  // Initialize reviewer reputations (all start at 1.0)
  // In future iterations, this could be based on previous reviewer scores
  const reviewerReputations = new Map<string, number>(
    users.map((u) => [u.id, 1.0])
  );

  // Calculate quality score for each prompt
  const promptQualityScores = new Map<string, number>();

  for (const prompt of prompts) {
    const promptFeedbacks = feedbacksByPrompt.get(prompt.id) || [];
    const quality = calculatePromptQuality(
      promptFeedbacks,
      reviewerReputations,
      coefficients.minReviewsForQuality
    );
    promptQualityScores.set(prompt.id, quality);
  }

  // Group prompts by creatorId
  const promptsByCreator = groupBy(prompts, 'creatorId');

  // Calculate contributor scores
  const scores: ContributorLeaderboardEntry[] = [];

  for (const user of users) {
    const userPrompts = promptsByCreator.get(user.id) || [];

    // Sum quality scores of all prompts by this contributor
    let qualityScore = 0;
    for (const prompt of userPrompts) {
      qualityScore += promptQualityScores.get(prompt.id) || 0;
    }

    // Affiliation bonus
    const affiliationBonus = user.hasAffiliation
      ? coefficients.affiliationBonusPoints
      : 0;

    // Total score
    const totalScore = qualityScore + affiliationBonus;

    // Average prompt quality
    const avgPromptQuality =
      userPrompts.length > 0 ? qualityScore / userPrompts.length : 0;

    scores.push({
      userId: user.id,
      displayName: user.displayName,
      totalScore,
      qualityScore,
      affiliationBonus,
      promptCount: userPrompts.length,
      avgPromptQuality,
    });
  }

  // Sort by total score descending
  return scores.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Calculate weighted average quality for a single prompt
 *
 * Formula:
 * quality = Σ(opinion_i * reputation_i) / Σ(reputation_i)
 *
 * where opinion is +1 for positive, -1 for negative
 */
function calculatePromptQuality(
  feedbacks: Feedback[],
  reviewerReputations: Map<string, number>,
  minReviews: number
): number {
  // Prompts with fewer than minReviews get a quality score of 0
  if (feedbacks.length < minReviews) {
    return 0;
  }

  let numerator = 0;
  let denominator = 0;

  for (const feedback of feedbacks) {
    // Convert opinion to numeric score
    const opinion = feedback.opinion === 'positive' ? 1 : -1;

    // Get reviewer's reputation (default to 1.0 if not found)
    const reputation = reviewerReputations.get(feedback.userId) || 1.0;

    numerator += opinion * reputation;
    denominator += reputation;
  }

  // Return weighted average
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Utility: Group array of objects by a key
 */
function groupBy<T>(
  array: T[],
  key: keyof T
): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of array) {
    const keyValue = String(item[key]);
    const group = map.get(keyValue) || [];
    group.push(item);
    map.set(keyValue, group);
  }

  return map;
}
