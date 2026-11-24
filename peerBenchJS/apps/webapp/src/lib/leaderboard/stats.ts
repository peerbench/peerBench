/**
 * Statistics Calculator
 *
 * Calculates various statistics about input data for debugging and analysis.
 */

import type { InputData, LeaderboardStats, Feedback } from './types';

/**
 * Calculate comprehensive statistics about the input data
 */
export function calculateStats(data: InputData): LeaderboardStats {
  const { users, prompts, feedbacks } = data;

  // Group feedbacks by promptId
  const feedbacksByPrompt = new Map<string, Feedback[]>();
  for (const feedback of feedbacks) {
    const group = feedbacksByPrompt.get(feedback.promptId) || [];
    group.push(feedback);
    feedbacksByPrompt.set(feedback.promptId, group);
  }

  // Group feedbacks by userId (reviewer)
  const feedbacksByReviewer = new Map<string, Feedback[]>();
  for (const feedback of feedbacks) {
    const group = feedbacksByReviewer.get(feedback.userId) || [];
    group.push(feedback);
    feedbacksByReviewer.set(feedback.userId, group);
  }

  // Prompt statistics
  let promptsWithNoReviews = 0;
  let promptsWith1Review = 0;
  let promptsWith2Reviews = 0;
  let promptsWith3PlusReviews = 0;

  for (const prompt of prompts) {
    const reviewCount = feedbacksByPrompt.get(prompt.id)?.length || 0;
    if (reviewCount === 0) promptsWithNoReviews++;
    else if (reviewCount === 1) promptsWith1Review++;
    else if (reviewCount === 2) promptsWith2Reviews++;
    else promptsWith3PlusReviews++;
  }

  const avgReviewsPerPrompt =
    prompts.length > 0 ? feedbacks.length / prompts.length : 0;

  // Reviewer statistics
  const totalReviewers = feedbacksByReviewer.size;
  const reviewersWith5PlusReviews = Array.from(feedbacksByReviewer.values()).filter(
    (reviews) => reviews.length >= 5
  ).length;

  const avgReviewsPerReviewer =
    totalReviewers > 0 ? feedbacks.length / totalReviewers : 0;

  // Affiliation statistics
  const usersWithAffiliation = users.filter((u) => u.hasAffiliation).length;

  // Opinion distribution
  const positiveFeedbacks = feedbacks.filter(
    (f) => f.opinion === 'positive'
  ).length;
  const negativeFeedbacks = feedbacks.filter(
    (f) => f.opinion === 'negative'
  ).length;

  // Date ranges (if available - only in real data, not simulation)
  const oldestFeedbackDate = undefined;
  const newestFeedbackDate = undefined;

  return {
    totalUsers: users.length,
    totalPrompts: prompts.length,
    totalFeedbacks: feedbacks.length,
    promptsWithNoReviews,
    promptsWith1Review,
    promptsWith2Reviews,
    promptsWith3PlusReviews,
    avgReviewsPerPrompt,
    totalReviewers,
    reviewersWith5PlusReviews,
    avgReviewsPerReviewer,
    usersWithAffiliation,
    positiveFeedbacks,
    negativeFeedbacks,
    oldestFeedbackDate,
    newestFeedbackDate,
  };
}

/**
 * Format stats for console logging
 */
export function formatStatsForConsole(stats: LeaderboardStats): string {
  return `
═══════════════════════════════════════════════════════════
                 LEADERBOARD INPUT DATA STATS
═══════════════════════════════════════════════════════════

USERS
  Total Users:              ${stats.totalUsers}
  With Affiliation:         ${stats.usersWithAffiliation} (${((stats.usersWithAffiliation / stats.totalUsers) * 100).toFixed(1)}%)

PROMPTS
  Total Prompts:            ${stats.totalPrompts}
  With 0 Reviews:           ${stats.promptsWithNoReviews} (${((stats.promptsWithNoReviews / stats.totalPrompts) * 100).toFixed(1)}%)
  With 1 Review:            ${stats.promptsWith1Review} (${((stats.promptsWith1Review / stats.totalPrompts) * 100).toFixed(1)}%)
  With 2 Reviews:           ${stats.promptsWith2Reviews} (${((stats.promptsWith2Reviews / stats.totalPrompts) * 100).toFixed(1)}%)
  With ≥3 Reviews:          ${stats.promptsWith3PlusReviews} (${((stats.promptsWith3PlusReviews / stats.totalPrompts) * 100).toFixed(1)}%)
  Avg Reviews/Prompt:       ${stats.avgReviewsPerPrompt.toFixed(2)}

REVIEWERS
  Total Reviewers:          ${stats.totalReviewers}
  With ≥5 Reviews:          ${stats.reviewersWith5PlusReviews} (${((stats.reviewersWith5PlusReviews / stats.totalReviewers) * 100).toFixed(1)}%)
  Avg Reviews/Reviewer:     ${stats.avgReviewsPerReviewer.toFixed(2)}

FEEDBACKS
  Total Feedbacks:          ${stats.totalFeedbacks}
  Positive:                 ${stats.positiveFeedbacks} (${((stats.positiveFeedbacks / stats.totalFeedbacks) * 100).toFixed(1)}%)
  Negative:                 ${stats.negativeFeedbacks} (${((stats.negativeFeedbacks / stats.totalFeedbacks) * 100).toFixed(1)}%)

═══════════════════════════════════════════════════════════
  `.trim();
}
