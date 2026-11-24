/**
 * User Score Types - Version 0002
 *
 * Comprehensive user contribution scoring system
 */

// ============================================================================
// Configuration
// ============================================================================

export interface UserScoreConfig {
  // One-time bonuses
  affiliationBonus: number;
  benchmarkCreatorBonus: number;
  diverseFeedbackBenchmarksBonus: number;
  diverseFeedbackUsersBonus: number;
  qualityPromptsBonus: number;
  difficultPromptsBonus: number;
  sotaDifficultPromptsBonus: number;

  // Continuous component coefficients
  hIndexCoefficient: number;
  qualityPromptsCoefficient: number;
  feedbackActivityCoefficient: number;
  collaborationCoefficient: number;

  // Optional bonuses
  diversityCoefficient: number;
  consistencyCoefficient: number;
  commentCoefficient: number;
  reviewQualityCoefficient: number;

  // Thresholds
  minPositiveFeedbacks: number;
  minBenchmarkContributors: number;
  minFeedbackBenchmarks: number;
  minFeedbackUsers: number;
  minQualityPrompts: number;
  minDifficultPrompts: number;
  wrongAnswerThreshold: number;

  // SOTA model list (configurable)
  sotaModels: string[];
}

export const DEFAULT_USER_SCORE_CONFIG: UserScoreConfig = {
  // One-time bonuses
  affiliationBonus: 50,
  benchmarkCreatorBonus: 100,
  diverseFeedbackBenchmarksBonus: 30,
  diverseFeedbackUsersBonus: 40,
  qualityPromptsBonus: 75,
  difficultPromptsBonus: 100,
  sotaDifficultPromptsBonus: 150,

  // Continuous coefficients
  hIndexCoefficient: 2,
  qualityPromptsCoefficient: 5,
  feedbackActivityCoefficient: 0.5,
  collaborationCoefficient: 10,

  // Optional bonuses
  diversityCoefficient: 8,
  consistencyCoefficient: 3,
  commentCoefficient: 1,
  reviewQualityCoefficient: 50,

  // Thresholds
  minPositiveFeedbacks: 3,
  minBenchmarkContributors: 3,
  minFeedbackBenchmarks: 3,
  minFeedbackUsers: 5,
  minQualityPrompts: 3,
  minDifficultPrompts: 3,
  wrongAnswerThreshold: 0.5,

  // SOTA models (default list - user configurable)
  sotaModels: [
    'claude-sonnet-4.5',
    'gpt-4o',
    'gpt-o1',
    'gemini-2.0-flash',
    'gemini-2.0-pro',
    'deepseek-v3',
  ],
};

// ============================================================================
// Score Components
// ============================================================================

export interface UserScoreComponents {
  // One-time bonuses (boolean flags + points)
  bonuses: {
    hasAffiliation: boolean;
    affiliationPoints: number;

    hasBenchmarkCreator: boolean;
    benchmarkCreatorPoints: number;

    hasDiverseFeedbackBenchmarks: boolean;
    diverseFeedbackBenchmarksPoints: number;

    hasDiverseFeedbackUsers: boolean;
    diverseFeedbackUsersPoints: number;

    hasQualityPrompts: boolean;
    qualityPromptsPoints: number;

    hasDifficultPrompts: boolean;
    difficultPromptsPoints: number;

    hasSotaDifficultPrompts: boolean;
    sotaDifficultPromptsPoints: number;
  };

  // Continuous components (raw values + calculated points)
  continuous: {
    hIndex: number;
    hIndexPoints: number;

    qualityPromptsCount: number;
    qualityPromptsPoints: number;

    feedbackCount: number;
    feedbackActivityPoints: number;

    collaboratorCount: number;
    collaborationPoints: number;
  };

  // Optional components
  optional?: {
    categoryCount?: number;
    diversityPoints?: number;

    activeMonths?: number;
    consistencyPoints?: number;

    commentCount?: number;
    commentPoints?: number;

    reviewerPearson?: number;
    reviewQualityPoints?: number;
  };

  // Totals
  totalBonuses: number;
  totalContinuous: number;
  totalOptional: number;
  totalScore: number;
}

// ============================================================================
// User Score Entry
// ============================================================================

export interface UserScoreEntry {
  userId: string;
  displayName: string;
  totalScore: number;
  components: UserScoreComponents;

  // Summary stats for display
  promptsCreated: number;
  feedbacksGiven: number;
  benchmarksOwned: number;
}

// ============================================================================
// Input Data for Scoring
// ============================================================================

export interface UserPrompt {
  id: string;
  creatorId: string;
  question: string;
  promptSetId?: number;
  category?: string;
  createdAt?: Date;
}

export interface UserFeedback {
  id: string;
  userId: string;
  promptId: string;
  opinion: 'positive' | 'negative';
  promptSetId?: number;
  promptCreatorId?: string;
}

export interface UserResponse {
  id: string;
  promptId: string;
  modelId: number;
  modelName: string;
  score: number;
}

export interface UserBenchmark {
  id: number;
  ownerId: string;
  title: string;
  contributorIds: string[]; // Unique prompt creators
}

export interface UserCollaboration {
  userId: string;
  promptSetId: number;
  role: string;
}

export interface UserComment {
  id: number;
  userId: string;
  createdAt: Date;
}

export interface UserScoreInputData {
  users: Array<{
    id: string;
    displayName: string;
    hasAffiliation: boolean;
  }>;
  prompts: UserPrompt[];
  feedbacks: UserFeedback[];
  responses: UserResponse[];
  benchmarks: UserBenchmark[];
  collaborations: UserCollaboration[];
  comments?: UserComment[];
}

// ============================================================================
// Results
// ============================================================================

export interface UserScoreResults {
  scores: UserScoreEntry[];
  config: UserScoreConfig;
  calculatedAt: Date;
  stats: UserScoreStats;
}

export interface UserScoreStats {
  totalUsers: number;
  usersWithScore: number;
  averageScore: number;
  medianScore: number;
  top10PercentileScore: number;

  // Distribution
  scoresDistribution: {
    range: string;
    count: number;
  }[];

  // Activity stats
  totalPrompts: number;
  totalFeedbacks: number;
  totalBenchmarks: number;
  averagePromptsPerUser: number;
  averageFeedbacksPerUser: number;
}
