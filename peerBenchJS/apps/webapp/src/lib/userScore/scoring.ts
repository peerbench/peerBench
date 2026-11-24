/**
 * User Score Calculation Algorithm
 *
 * Comprehensive scoring based on multiple contribution dimensions
 */

import type {
  UserScoreConfig,
  UserScoreEntry,
  UserScoreComponents,
  UserScoreInputData,
  UserPrompt,
  UserFeedback,
  UserResponse,
} from './types';

/**
 * Calculate user scores for all users
 */
export function calculateUserScores(
  data: UserScoreInputData,
  config: UserScoreConfig
): UserScoreEntry[] {
  const scores: UserScoreEntry[] = [];

  // Build lookup maps for efficient querying
  const feedbacksByUser = groupBy(data.feedbacks, 'userId');
  const feedbacksByPrompt = groupBy(data.feedbacks, 'promptId');
  const promptsByCreator = groupBy(data.prompts, 'creatorId');
  const responsesByPrompt = groupBy(data.responses, 'promptId');
  const benchmarksByOwner = groupBy(data.benchmarks, 'ownerId');
  const collaborationsByUser = groupBy(data.collaborations, 'userId');

  for (const user of data.users) {
    const userPrompts = promptsByCreator.get(user.id) || [];
    const userFeedbacks = feedbacksByUser.get(user.id) || [];
    const userBenchmarks = benchmarksByOwner.get(user.id) || [];
    const userCollaborations = collaborationsByUser.get(user.id) || [];

    // Calculate all components
    const components = calculateUserScoreComponents(
      user,
      userPrompts,
      userFeedbacks,
      userBenchmarks,
      userCollaborations,
      feedbacksByPrompt,
      responsesByPrompt,
      data,
      config
    );

    scores.push({
      userId: user.id,
      displayName: user.displayName,
      totalScore: components.totalScore,
      components,
      promptsCreated: userPrompts.length,
      feedbacksGiven: userFeedbacks.length,
      benchmarksOwned: userBenchmarks.length,
    });
  }

  // Sort by total score descending
  return scores.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Calculate all score components for a single user
 */
function calculateUserScoreComponents(
  user: { id: string; hasAffiliation: boolean },
  userPrompts: UserPrompt[],
  userFeedbacks: UserFeedback[],
  userBenchmarks: any[],
  userCollaborations: any[],
  feedbacksByPrompt: Map<string, UserFeedback[]>,
  responsesByPrompt: Map<string, UserResponse[]>,
  allData: UserScoreInputData,
  config: UserScoreConfig
): UserScoreComponents {
  // ========================================================================
  // ONE-TIME BONUSES
  // ========================================================================

  // 1. Affiliation Bonus
  const hasAffiliation = user.hasAffiliation;
  const affiliationPoints = hasAffiliation ? config.affiliationBonus : 0;

  // 2. Benchmark Creator Bonus
  const hasBenchmarkCreator = userBenchmarks.some(
    (b) => b.contributorIds.length >= config.minBenchmarkContributors
  );
  const benchmarkCreatorPoints = hasBenchmarkCreator
    ? config.benchmarkCreatorBonus
    : 0;

  // 3. Diverse Feedback (Benchmarks) Bonus
  const uniqueFeedbackBenchmarks = new Set(
    userFeedbacks.map((f) => f.promptSetId).filter((id): id is number => id !== undefined)
  );
  const hasDiverseFeedbackBenchmarks =
    uniqueFeedbackBenchmarks.size >= config.minFeedbackBenchmarks;
  const diverseFeedbackBenchmarksPoints = hasDiverseFeedbackBenchmarks
    ? config.diverseFeedbackBenchmarksBonus
    : 0;

  // 4. Diverse Feedback (Users) Bonus
  const uniqueFeedbackUsers = new Set(
    userFeedbacks.map((f) => f.promptCreatorId).filter((id): id is string => id !== undefined)
  );
  const hasDiverseFeedbackUsers =
    uniqueFeedbackUsers.size >= config.minFeedbackUsers;
  const diverseFeedbackUsersPoints = hasDiverseFeedbackUsers
    ? config.diverseFeedbackUsersBonus
    : 0;

  // 5. Quality Prompts Bonus (3+ prompts with 3+ positive feedbacks)
  const promptsWithQualityFeedback = userPrompts.filter((p) => {
    const feedbacks = feedbacksByPrompt.get(p.id) || [];
    const positiveFeedbacks = feedbacks.filter((f) => f.opinion === 'positive');
    return positiveFeedbacks.length >= config.minPositiveFeedbacks;
  });
  const hasQualityPrompts =
    promptsWithQualityFeedback.length >= config.minQualityPrompts;
  const qualityPromptsPoints = hasQualityPrompts ? config.qualityPromptsBonus : 0;

  // 6. Difficult Prompts Bonus (3+ prompts with 3+ positive & 3+ models wrong)
  const difficultPrompts = userPrompts.filter((p) => {
    const feedbacks = feedbacksByPrompt.get(p.id) || [];
    const positiveFeedbacks = feedbacks.filter((f) => f.opinion === 'positive');
    if (positiveFeedbacks.length < config.minPositiveFeedbacks) return false;

    const responses = responsesByPrompt.get(p.id) || [];
    const wrongResponses = responses.filter(
      (r) => r.score < config.wrongAnswerThreshold
    );
    return wrongResponses.length >= 3;
  });
  const hasDifficultPrompts =
    difficultPrompts.length >= config.minDifficultPrompts;
  const difficultPromptsPoints = hasDifficultPrompts
    ? config.difficultPromptsBonus
    : 0;

  // 7. SOTA Difficult Prompts Bonus (3+ prompts with 3+ positive & 3+ SOTA models wrong)
  const sotaDifficultPrompts = userPrompts.filter((p) => {
    const feedbacks = feedbacksByPrompt.get(p.id) || [];
    const positiveFeedbacks = feedbacks.filter((f) => f.opinion === 'positive');
    if (positiveFeedbacks.length < config.minPositiveFeedbacks) return false;

    const responses = responsesByPrompt.get(p.id) || [];
    const sotaWrongResponses = responses.filter((r) => {
      const isSOTA = config.sotaModels.some((sotaModel) =>
        r.modelName.toLowerCase().includes(sotaModel.toLowerCase())
      );
      return isSOTA && r.score < config.wrongAnswerThreshold;
    });
    return sotaWrongResponses.length >= 3;
  });
  const hasSotaDifficultPrompts =
    sotaDifficultPrompts.length >= config.minDifficultPrompts;
  const sotaDifficultPromptsPoints = hasSotaDifficultPrompts
    ? config.sotaDifficultPromptsBonus
    : 0;

  // ========================================================================
  // CONTINUOUS COMPONENTS
  // ========================================================================

  // 8. H-Index Score
  const positiveFeedbackCounts = userPrompts.map((p) => {
    const feedbacks = feedbacksByPrompt.get(p.id) || [];
    return feedbacks.filter((f) => f.opinion === 'positive').length;
  });
  const hIndex = calculateHIndex(positiveFeedbackCounts);
  const hIndexPoints = hIndex * hIndex * config.hIndexCoefficient;

  // 9. Quality Prompts Score (count of prompts with 3+ positive)
  const qualityPromptsCount = promptsWithQualityFeedback.length;
  const qualityPromptsPointsCont =
    qualityPromptsCount * config.qualityPromptsCoefficient;

  // 10. Feedback Activity Score
  const feedbackCount = userFeedbacks.length;
  const feedbackActivityPoints =
    feedbackCount * config.feedbackActivityCoefficient;

  // 11. Collaboration Score
  const collaboratorCount = calculateCollaboratorCount(
    user.id,
    userBenchmarks,
    userCollaborations,
    allData
  );
  const collaborationPoints =
    collaboratorCount * config.collaborationCoefficient;

  // ========================================================================
  // TOTALS
  // ========================================================================

  const totalBonuses =
    affiliationPoints +
    benchmarkCreatorPoints +
    diverseFeedbackBenchmarksPoints +
    diverseFeedbackUsersPoints +
    qualityPromptsPoints +
    difficultPromptsPoints +
    sotaDifficultPromptsPoints;

  const totalContinuous =
    hIndexPoints +
    qualityPromptsPointsCont +
    feedbackActivityPoints +
    collaborationPoints;

  const totalOptional = 0; // Reserved for optional bonuses

  const totalScore = totalBonuses + totalContinuous + totalOptional;

  return {
    bonuses: {
      hasAffiliation,
      affiliationPoints,
      hasBenchmarkCreator,
      benchmarkCreatorPoints,
      hasDiverseFeedbackBenchmarks,
      diverseFeedbackBenchmarksPoints,
      hasDiverseFeedbackUsers,
      diverseFeedbackUsersPoints,
      hasQualityPrompts,
      qualityPromptsPoints,
      hasDifficultPrompts,
      difficultPromptsPoints,
      hasSotaDifficultPrompts,
      sotaDifficultPromptsPoints,
    },
    continuous: {
      hIndex,
      hIndexPoints,
      qualityPromptsCount,
      qualityPromptsPoints: qualityPromptsPointsCont,
      feedbackCount,
      feedbackActivityPoints,
      collaboratorCount,
      collaborationPoints,
    },
    totalBonuses,
    totalContinuous,
    totalOptional,
    totalScore,
  };
}

/**
 * Calculate H-index
 * A user has h-index h if they have h prompts with at least h positive feedbacks each
 */
function calculateHIndex(positiveFeedbackCounts: number[]): number {
  // Sort descending
  const sorted = [...positiveFeedbackCounts].sort((a, b) => b - a);

  let h = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i]! >= i + 1) {
      h = i + 1;
    } else {
      break;
    }
  }

  return h;
}

/**
 * Calculate number of unique collaborators
 */
function calculateCollaboratorCount(
  userId: string,
  userBenchmarks: any[],
  userCollaborations: any[],
  allData: UserScoreInputData
): number {
  const collaborators = new Set<string>();

  // Get contributors from owned benchmarks
  for (const benchmark of userBenchmarks) {
    for (const contributorId of benchmark.contributorIds) {
      if (contributorId !== userId) {
        collaborators.add(contributorId);
      }
    }
  }

  // Get co-authors from prompt sets where user has role
  for (const collab of userCollaborations) {
    const benchmark = allData.benchmarks.find((b) => b.id === collab.promptSetId);
    if (benchmark) {
      for (const contributorId of benchmark.contributorIds) {
        if (contributorId !== userId) {
          collaborators.add(contributorId);
        }
      }
    }
  }

  return collaborators.size;
}

/**
 * Utility: Group array by key
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
