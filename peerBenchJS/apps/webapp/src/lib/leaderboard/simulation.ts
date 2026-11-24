/**
 * Simulation System
 *
 * Generates virtual users, prompts, and feedbacks to test scoring algorithms.
 * Different user personas exhibit different behaviors:
 * - Altruistic: Honest reviews based on actual prompt quality
 * - Greedy: Only reviews own prompts positively, ignores others
 * - Cabal: Groups that upvote each other, downvote outsiders
 * - Random: Random opinions regardless of quality
 * - Malicious: Intentionally gives wrong reviews
 */

import type {
  SimulationConfig,
  SimulatedData,
  SimulatedUser,
  SimulatedPrompt,
  Feedback,
  PersonaType,
} from './types';

/**
 * Run a complete simulation
 */
export function runSimulation(config: SimulationConfig): SimulatedData {
  console.log('Starting simulation with config:', config);

  // Generate virtual users
  const users = createVirtualUsers(config);
  console.log(`Created ${users.length} virtual users`);

  // Generate virtual prompts
  const prompts = createVirtualPrompts(config, users);
  console.log(`Created ${prompts.length} virtual prompts`);

  // Generate feedbacks based on persona behaviors
  const feedbacks = generateFeedbacks(config, users, prompts);
  console.log(`Created ${feedbacks.length} virtual feedbacks`);

  return {
    users,
    prompts,
    feedbacks,
    config,
    generatedAt: new Date(),
  };
}

/**
 * Create virtual users with different personas
 */
function createVirtualUsers(config: SimulationConfig): SimulatedUser[] {
  const users: SimulatedUser[] = [];
  const { numUsers, personas } = config;

  // Validate percentages sum to 100
  const sum = Object.values(personas).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 100) > 0.01) {
    console.warn(`Persona percentages sum to ${sum}%, not 100%. Normalizing...`);
  }

  // Calculate counts per persona
  const counts: Record<PersonaType, number> = {
    altruistic: Math.floor((numUsers * personas.altruistic) / 100),
    greedy: Math.floor((numUsers * personas.greedy) / 100),
    cabal: Math.floor((numUsers * personas.cabal) / 100),
    random: Math.floor((numUsers * personas.random) / 100),
    malicious: Math.floor((numUsers * personas.malicious) / 100),
  };

  // Adjust for rounding errors
  const totalCounted = Object.values(counts).reduce((a, b) => a + b, 0);
  if (totalCounted < numUsers) {
    counts.altruistic += numUsers - totalCounted;
  }

  let cabalCounter = 0;

  // Create users for each persona type
  for (const [persona, count] of Object.entries(counts) as [PersonaType, number][]) {
    for (let i = 0; i < count; i++) {
      const user: SimulatedUser = {
        id: `sim-user-${persona}-${i}`,
        displayName: `${capitalize(persona)} User ${i + 1}`,
        hasAffiliation: Math.random() > 0.5, // 50% have affiliation
        persona,
      };

      // Assign cabal IDs
      if (persona === 'cabal') {
        user.cabalId = `cabal-${Math.floor(cabalCounter / config.cabalSize)}`;
        cabalCounter++;
      }

      users.push(user);
    }
  }

  return users;
}

/**
 * Create virtual prompts (some good, some bad based on config)
 */
function createVirtualPrompts(
  config: SimulationConfig,
  users: SimulatedUser[]
): SimulatedPrompt[] {
  const prompts: SimulatedPrompt[] = [];
  const { numPromptsPerUser, percentageGoodPrompts } = config;

  for (const user of users) {
    const numPrompts = randomInt(numPromptsPerUser.min, numPromptsPerUser.max);

    for (let i = 0; i < numPrompts; i++) {
      const isGoodQuality = Math.random() * 100 < percentageGoodPrompts;

      prompts.push({
        id: `sim-prompt-${user.id}-${i}`,
        creatorId: user.id,
        question: generatePromptQuestion(user.persona, i, isGoodQuality),
        isGoodQuality,
      });
    }
  }

  return prompts;
}

/**
 * Generate feedbacks based on user persona behaviors
 */
function generateFeedbacks(
  config: SimulationConfig,
  users: SimulatedUser[],
  prompts: SimulatedPrompt[]
): Feedback[] {
  const feedbacks: Feedback[] = [];
  const { probabilityReview, probabilityMultipleReviews } = config;

  for (const user of users) {
    for (const prompt of prompts) {
      // Don't review own prompts (except for greedy persona)
      if (prompt.creatorId === user.id && user.persona !== 'greedy') {
        continue;
      }

      // Base probability to review
      if (Math.random() > probabilityReview) {
        continue;
      }

      // Additional check for multiple reviews on same prompt
      const existingReviews = feedbacks.filter((f) => f.promptId === prompt.id);
      if (existingReviews.length >= 3 && Math.random() > probabilityMultipleReviews) {
        continue; // Less likely to add more reviews once prompt has 3+
      }

      // Determine opinion based on persona
      const opinion = determineOpinion(user, prompt, prompts, users);

      if (opinion) {
        feedbacks.push({
          id: `sim-feedback-${user.id}-${prompt.id}`,
          userId: user.id,
          promptId: prompt.id,
          opinion,
        });
      }
    }
  }

  return feedbacks;
}

/**
 * Determine a user's opinion on a prompt based on their persona
 */
function determineOpinion(
  user: SimulatedUser,
  prompt: SimulatedPrompt,
  allPrompts: SimulatedPrompt[],
  allUsers: SimulatedUser[]
): 'positive' | 'negative' | null {
  switch (user.persona) {
    case 'altruistic':
      // Honest review based on actual prompt quality
      return prompt.isGoodQuality ? 'positive' : 'negative';

    case 'greedy':
      // Only review own prompts positively
      if (prompt.creatorId === user.id) {
        return 'positive';
      }
      // Ignore or occasionally downvote others
      return Math.random() > 0.8 ? 'negative' : null;

    case 'cabal':
      const promptCreator = allUsers.find((u) => u.id === prompt.creatorId);
      if (promptCreator?.cabalId === user.cabalId) {
        // Always upvote cabal members
        return 'positive';
      } else {
        // Mostly downvote outsiders
        return Math.random() > 0.3 ? 'negative' : 'positive';
      }

    case 'random':
      // Completely random
      return Math.random() > 0.5 ? 'positive' : 'negative';

    case 'malicious':
      // Intentionally wrong reviews
      return prompt.isGoodQuality ? 'negative' : 'positive';

    default:
      return null;
  }
}

/**
 * Generate a realistic prompt question
 */
function generatePromptQuestion(
  persona: PersonaType,
  index: number,
  isGoodQuality: boolean
): string {
  const qualityPrefix = isGoodQuality ? 'Good' : 'Poor';
  const topics = [
    'mathematics',
    'coding',
    'reasoning',
    'factual knowledge',
    'creative writing',
  ];
  const topic = topics[index % topics.length];

  return `[${qualityPrefix}] ${capitalize(persona)} user's ${topic} question #${index + 1}`;
}

/**
 * Utility: Random integer between min (inclusive) and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Utility: Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
