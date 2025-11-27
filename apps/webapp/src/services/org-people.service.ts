"use server";

import { db } from "@/database/client";
import { orgToPeopleTable } from "@/database/schema";
import { eq, and } from "drizzle-orm";

export interface OrgPeopleData {
  orgId: number;
  userId: string;
}

/**
 * Add a user to an organization
 * @param data - Organization and user data
 * @returns Success result
 */
export async function addUserToOrg(data: OrgPeopleData) {
  try {
    // Check if relationship already exists
    const existing = await db
      .select()
      .from(orgToPeopleTable)
      .where(and(
        eq(orgToPeopleTable.orgId, data.orgId),
        eq(orgToPeopleTable.userId, data.userId)
      ))
      .limit(1);

    if (existing.length > 0) {
      return { 
        success: false, 
        error: "User is already affiliated with this organization",
        isDuplicate: true 
      };
    }

    // Add the relationship
    const result = await db.insert(orgToPeopleTable).values({
      orgId: data.orgId,
      userId: data.userId,
    }).returning();

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to add user to organization:", error);
    return { success: false, error: "Failed to add user to organization" };
  }
}

/**
 * Remove a user from an organization
 * @param data - Organization and user data
 * @returns Success result
 */
export async function removeUserFromOrg(data: OrgPeopleData) {
  try {
    const result = await db
      .delete(orgToPeopleTable)
      .where(and(
        eq(orgToPeopleTable.orgId, data.orgId),
        eq(orgToPeopleTable.userId, data.userId)
      ))
      .returning();

    if (result.length === 0) {
      return { success: false, error: "Relationship not found" };
    }

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to remove user from organization:", error);
    return { success: false, error: "Failed to remove user from organization" };
  }
}

/**
 * Check if a user is affiliated with an organization
 * @param data - Organization and user data
 * @returns Affiliation status
 */
export async function isUserAffiliatedWithOrg(data: OrgPeopleData) {
  try {
    const result = await db
      .select()
      .from(orgToPeopleTable)
      .where(and(
        eq(orgToPeopleTable.orgId, data.orgId),
        eq(orgToPeopleTable.userId, data.userId)
      ))
      .limit(1);

    return { 
      success: true, 
      isAffiliated: result.length > 0,
      data: result[0] || null
    };
  } catch (error) {
    console.error("Failed to check affiliation:", error);
    return { success: false, error: "Failed to check affiliation" };
  }
}

/**
 * Get all organizations a user is affiliated with
 * @param userId - User ID
 * @returns Array of organization relationships
 */
export async function getUserOrganizations(userId: string) {
  try {
    const result = await db
      .select({
        id: orgToPeopleTable.id,
        orgId: orgToPeopleTable.orgId,
        userId: orgToPeopleTable.userId,
        createdAt: orgToPeopleTable.createdAt,
      })
      .from(orgToPeopleTable)
      .where(eq(orgToPeopleTable.userId, userId))
      .orderBy(orgToPeopleTable.createdAt);

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to get user organizations:", error);
    return { success: false, error: "Failed to get user organizations" };
  }
}
