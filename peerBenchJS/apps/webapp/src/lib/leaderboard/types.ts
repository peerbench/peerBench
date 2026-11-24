/**
 * Leaderboard Types - All client-side, no database changes
 */

// ============================================================================
// Data Source Types
// ============================================================================

export type DataSourceType = 'real' | 'simulated';

export interface User {
  id: string;
  displayName: string;
  hasAffiliation: boolean;
}

export interface Prompt {
  id: string;
  creatorId: string;
  question: string;
  isGoodQuality?: boolean; // Only used in simulation (ground truth)
}

export interface Feedback {
  id: string;
  userId: string;
  promptId: string;
  opinion: 'positive' | 'negative';
}

export interface InputData {
  users: User[];
  prompts: Prompt[];
  feedbacks: Feedback[];
}

// ============================================================================
// Simulation Types
// ============================================================================

export type PersonaType = 'altruistic' | 'greedy' | 'cabal' | 'random' | 'malicious';

export interface SimulationConfig {
  numUsers: number;
  personas: {
    altruistic: number;    // percentage (0-100)
    greedy: number;
    cabal: number;
    random: number;
    malicious: number;
  };
  numPromptsPerUser: {
    min: number;
    max: number;
  };
  probabilityReview: number;           // 0-1, probability a user reviews a prompt
  probabilityMultipleReviews: number;  // 0-1, probability a prompt gets multiple reviews
  percentageGoodPrompts: number;       // 0-100, percentage of prompts that are "good quality"
  cabalSize: number;                   // How many users per cabal group
}

export interface SimulatedUser extends User {
  persona: PersonaType;
  cabalId?: string;
}

export interface SimulatedPrompt extends Prompt {
  isGoodQuality: boolean; // Ground truth for simulation
}

export interface SimulatedData {
  users: SimulatedUser[];
  prompts: SimulatedPrompt[];
  feedbacks: Feedback[];
  config: SimulationConfig;
  generatedAt: Date;
}

// ============================================================================
// Scoring Algorithm Configuration
// ============================================================================

export interface ContributorCoefficients {
  affiliationBonusPoints: number;
  qualityWeight: number;
  reputationWeight: number;
  reputationCap: number;
  minReviewsForQuality: number;
}

export interface ReviewerCoefficients {
  minReviewsRequired: number;
}

export interface AllCoefficients {
  contributor: ContributorCoefficients;
  reviewer: ReviewerCoefficients;
}

// ============================================================================
// Leaderboard Results
// ============================================================================

export interface ContributorLeaderboardEntry {
  userId: string;
  displayName: string;
  totalScore: number;
  qualityScore: number;
  affiliationBonus: number;
  promptCount: number;
  avgPromptQuality: number;
}

export interface ReviewerLeaderboardEntry {
  userId: string;
  displayName: string;
  pearsonCorrelation: number;
  totalScore: number;
  reviewCount: number;
  consensusAlignment: number;
}

export interface LeaderboardResults {
  contributorLeaderboard: ContributorLeaderboardEntry[];
  reviewerLeaderboard: ReviewerLeaderboardEntry[];
  stats: LeaderboardStats;
  calculatedAt: Date;
  coefficients: AllCoefficients;
}

// ============================================================================
// Statistics
// ============================================================================

export interface LeaderboardStats {
  // Input data counts
  totalUsers: number;
  totalPrompts: number;
  totalFeedbacks: number;

  // Prompt statistics
  promptsWithNoReviews: number;
  promptsWith1Review: number;
  promptsWith2Reviews: number;
  promptsWith3PlusReviews: number;
  avgReviewsPerPrompt: number;

  // Reviewer statistics
  totalReviewers: number;
  reviewersWith5PlusReviews: number;
  avgReviewsPerReviewer: number;

  // Affiliation statistics
  usersWithAffiliation: number;

  // Opinion distribution
  positiveFeedbacks: number;
  negativeFeedbacks: number;

  // Date ranges
  oldestFeedbackDate?: Date;
  newestFeedbackDate?: Date;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_CONTRIBUTOR_COEFFICIENTS: ContributorCoefficients = {
  affiliationBonusPoints: 10,
  qualityWeight: 0.7,
  reputationWeight: 0.3,
  reputationCap: 2,
  minReviewsForQuality: 3,
};

export const DEFAULT_REVIEWER_COEFFICIENTS: ReviewerCoefficients = {
  minReviewsRequired: 5,
};

export const DEFAULT_COEFFICIENTS: AllCoefficients = {
  contributor: DEFAULT_CONTRIBUTOR_COEFFICIENTS,
  reviewer: DEFAULT_REVIEWER_COEFFICIENTS,
};

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  numUsers: 50,
  personas: {
    altruistic: 40,
    greedy: 20,
    cabal: 20,
    random: 15,
    malicious: 5,
  },
  numPromptsPerUser: {
    min: 2,
    max: 8,
  },
  probabilityReview: 0.3,
  probabilityMultipleReviews: 0.6,
  percentageGoodPrompts: 60,
  cabalSize: 5,
};
