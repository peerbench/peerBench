/**
 * Data Fetcher
 *
 * Fetches real data from database for leaderboard calculations.
 * Uses server actions to query database from client components.
 */

'use server';

import { db } from '@/database/client';
import {
  promptsTable,
  quickFeedbacksTable,
  hashRegistrationsTable,
  orgToPeopleTable,
  userProfileTable,
} from '@/database/schema';
import { authUsers } from 'drizzle-orm/supabase';
import { eq, isNotNull, and } from 'drizzle-orm';
import type { InputData } from './types';

/**
 * Fetch all data needed for leaderboard calculations from the database
 */
export async function fetchRealData(): Promise<InputData> {
  console.log('Fetching real data from database...');

  try {
    // Fetch users with profile info
    const usersData = await db
      .select({
        id: authUsers.id,
        email: authUsers.email,
        displayName: userProfileTable.displayName,
      })
      .from(authUsers)
      .leftJoin(userProfileTable, eq(userProfileTable.userId, authUsers.id));

    // Fetch users with affiliations
    const affiliationsData = await db
      .select({
        userId: orgToPeopleTable.userId,
      })
      .from(orgToPeopleTable);

    const affiliationSet = new Set(affiliationsData.map((a) => a.userId));

    // Fetch prompts with their creators
    const promptsData = await db
      .select({
        promptId: promptsTable.id,
        question: promptsTable.question,
        hashCID: promptsTable.hashCIDRegistration,
        hashSHA256: promptsTable.hashSha256Registration,
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

    // Create a map of (cid, sha256) -> uploaderId
    const hashToUploader = new Map<string, string>();
    for (const hash of hashRegistrationsData) {
      if (hash.uploaderId) {
        const key = `${hash.cid}:${hash.sha256}`;
        hashToUploader.set(key, hash.uploaderId);
      }
    }

    // Fetch quick feedbacks (only for prompts)
    const feedbacksData = await db
      .select({
        id: quickFeedbacksTable.id,
        userId: quickFeedbacksTable.userId,
        promptId: quickFeedbacksTable.promptId,
        opinion: quickFeedbacksTable.opinion,
      })
      .from(quickFeedbacksTable)
      .where(isNotNull(quickFeedbacksTable.promptId));

    // Transform to InputData format
    const users = usersData.map((u) => ({
      id: u.id,
      displayName: u.displayName || u.email || 'Unknown User',
      hasAffiliation: affiliationSet.has(u.id),
    }));

    const prompts = promptsData
      .map((p) => {
        const key = `${p.hashCID}:${p.hashSHA256}`;
        const creatorId = hashToUploader.get(key);

        if (!creatorId) {
          return null; // Skip prompts without creator info
        }

        return {
          id: p.promptId,
          creatorId,
          question: p.question,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const feedbacks = feedbacksData
      .map((f) => {
        if (!f.promptId) return null;

        return {
          id: String(f.id),
          userId: f.userId,
          promptId: f.promptId,
          opinion: f.opinion as 'positive' | 'negative',
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    console.log(`Fetched ${users.length} users, ${prompts.length} prompts, ${feedbacks.length} feedbacks`);

    return {
      users,
      prompts,
      feedbacks,
    };
  } catch (error) {
    console.error('Error fetching real data:', error);
    throw new Error('Failed to fetch data from database');
  }
}
