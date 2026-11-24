/**
 * User Score Data Fetcher
 *
 * Fetches all required data from database for user score calculations
 */

'use server';

import { db } from '@/database/client';
import {
  promptsTable,
  quickFeedbacksTable,
  hashRegistrationsTable,
  orgToPeopleTable,
  userProfileTable,
  promptSetsTable,
  promptSetPrompts,
  responsesTable,
  scoresTable,
  providerModelsTable,
  userRoleOnPromptSetTable,
} from '@/database/schema';
import { authUsers } from 'drizzle-orm/supabase';
import { eq, isNotNull, and } from 'drizzle-orm';
import type { UserScoreInputData } from './types';

/**
 * Fetch all data needed for user score calculations
 */
export async function fetchUserScoreData(): Promise<UserScoreInputData> {
  console.log('Fetching user score data from database...');

  try {
    // Fetch users with affiliations
    const usersData = await db
      .select({
        id: authUsers.id,
        email: authUsers.email,
        displayName: userProfileTable.displayName,
      })
      .from(authUsers)
      .leftJoin(userProfileTable, eq(userProfileTable.userId, authUsers.id));

    const affiliationsData = await db
      .select({ userId: orgToPeopleTable.userId })
      .from(orgToPeopleTable);

    const affiliationSet = new Set(affiliationsData.map((a) => a.userId));

    // Fetch prompts with metadata
    const promptsData = await db
      .select({
        promptId: promptsTable.id,
        question: promptsTable.question,
        hashCID: promptsTable.hashCIDRegistration,
        hashSHA256: promptsTable.hashSha256Registration,
        createdAt: promptsTable.createdAt,
      })
      .from(promptsTable)
      .where(
        and(
          isNotNull(promptsTable.hashCIDRegistration),
          isNotNull(promptsTable.hashSha256Registration)
        )
      );

    // Fetch hash registrations to get prompt creators
    const hashRegistrationsData = await db
      .select({
        cid: hashRegistrationsTable.cid,
        sha256: hashRegistrationsTable.sha256,
        uploaderId: hashRegistrationsTable.uploaderId,
      })
      .from(hashRegistrationsTable)
      .where(isNotNull(hashRegistrationsTable.uploaderId));

    const hashToUploader = new Map<string, string>();
    for (const hash of hashRegistrationsData) {
      if (hash.uploaderId) {
        const key = `${hash.cid}:${hash.sha256}`;
        hashToUploader.set(key, hash.uploaderId);
      }
    }

    // Fetch prompt set memberships
    const promptSetMembershipsData = await db
      .select({
        promptId: promptSetPrompts.promptId,
        promptSetId: promptSetPrompts.promptSetId,
      })
      .from(promptSetPrompts);

    const promptToSet = new Map<string, number>();
    for (const membership of promptSetMembershipsData) {
      promptToSet.set(membership.promptId, membership.promptSetId);
    }

    // Fetch quick feedbacks
    const feedbacksData = await db
      .select({
        id: quickFeedbacksTable.id,
        userId: quickFeedbacksTable.userId,
        promptId: quickFeedbacksTable.promptId,
        opinion: quickFeedbacksTable.opinion,
      })
      .from(quickFeedbacksTable)
      .where(isNotNull(quickFeedbacksTable.promptId));

    // Fetch responses with scores
    const responsesData = await db
      .select({
        responseId: responsesTable.id,
        promptId: responsesTable.promptId,
        modelId: responsesTable.modelId,
        modelName: providerModelsTable.name,
        score: scoresTable.score,
      })
      .from(responsesTable)
      .leftJoin(scoresTable, eq(scoresTable.responseId, responsesTable.id))
      .leftJoin(providerModelsTable, eq(responsesTable.modelId, providerModelsTable.id))
      .where(isNotNull(scoresTable.score));

    // Fetch prompt sets with owner and contributors
    const promptSetsData = await db
      .select({
        id: promptSetsTable.id,
        ownerId: promptSetsTable.ownerId,
        title: promptSetsTable.title,
      })
      .from(promptSetsTable);

    // For each prompt set, count unique contributors
    const benchmarksWithContributors = await Promise.all(
      promptSetsData.map(async (ps) => {
        const contributors = await db
          .selectDistinct({
            uploaderId: hashRegistrationsTable.uploaderId,
          })
          .from(promptSetPrompts)
          .innerJoin(promptsTable, eq(promptSetPrompts.promptId, promptsTable.id))
          .innerJoin(
            hashRegistrationsTable,
            and(
              eq(hashRegistrationsTable.cid, promptsTable.hashCIDRegistration),
              eq(hashRegistrationsTable.sha256, promptsTable.hashSha256Registration)
            )
          )
          .where(
            and(
              eq(promptSetPrompts.promptSetId, ps.id),
              isNotNull(hashRegistrationsTable.uploaderId)
            )
          );

        return {
          id: ps.id,
          ownerId: ps.ownerId,
          title: ps.title,
          contributorIds: contributors
            .map((c) => c.uploaderId)
            .filter((id): id is string => id !== null),
        };
      })
    );

    // Fetch collaborations (user roles on prompt sets)
    const collaborationsData = await db
      .select({
        userId: userRoleOnPromptSetTable.userId,
        promptSetId: userRoleOnPromptSetTable.promptSetId,
        role: userRoleOnPromptSetTable.role,
      })
      .from(userRoleOnPromptSetTable);

    // Fetch comments (optional - for future use)
    const commentsData: any[] = [];

    // Transform to UserScoreInputData format
    const users = usersData.map((u) => ({
      id: u.id,
      displayName: u.displayName || u.email || 'Unknown User',
      hasAffiliation: affiliationSet.has(u.id),
    }));

    const prompts = promptsData
      .map((p) => {
        const key = `${p.hashCID}:${p.hashSHA256}`;
        const creatorId = hashToUploader.get(key);
        if (!creatorId) return null;

        return {
          id: p.promptId,
          creatorId,
          question: p.question,
          promptSetId: promptToSet.get(p.promptId),
          createdAt: p.createdAt,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const feedbacks = feedbacksData
      .map((f) => {
        if (!f.promptId) return null;

        const prompt = prompts.find((p) => p.id === f.promptId);

        return {
          id: String(f.id),
          userId: f.userId,
          promptId: f.promptId,
          opinion: f.opinion as 'positive' | 'negative',
          promptSetId: prompt?.promptSetId,
          promptCreatorId: prompt?.creatorId,
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    const responses = responsesData
      .map((r) => {
        if (!r.score || !r.modelName) return null;

        return {
          id: r.responseId,
          promptId: r.promptId,
          modelId: r.modelId,
          modelName: r.modelName,
          score: r.score,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const collaborations = collaborationsData.map((c) => ({
      userId: c.userId,
      promptSetId: c.promptSetId,
      role: c.role || 'collaborator',
    }));

    console.log(`Fetched: ${users.length} users, ${prompts.length} prompts, ${feedbacks.length} feedbacks, ${responses.length} responses, ${benchmarksWithContributors.length} benchmarks`);

    return {
      users,
      prompts,
      feedbacks,
      responses,
      benchmarks: benchmarksWithContributors,
      collaborations,
      comments: commentsData,
    };
  } catch (error) {
    console.error('Error fetching user score data:', error);
    throw new Error('Failed to fetch user score data from database');
  }
}
