"use server";

import { db } from "@/database/client";
import { keyToUserTable } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { signMessage } from "viem/accounts";
import { headers } from "next/headers";

export interface KeyData {
  publicKey: string;
  keyType: string;
  userUuid: string;
  keySigningUuid: string; // This will now contain the actual signed message
}

export interface DeviceMetadata {
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  source: string;
}

export async function storeUserKey(keyData: KeyData) {
  try {
    // Collect device and IP metadata
    const metadata = await collectDeviceMetadata();

    // Check if this exact public key already exists for this user
    const existingKey = await db
      .select()
      .from(keyToUserTable)
      .where(
        and(
          eq(keyToUserTable.userUuid, keyData.userUuid),
          eq(keyToUserTable.publicKey, keyData.publicKey)
        )
      )
      .limit(1);

    if (existingKey.length > 0) {
      return {
        success: false,
        error: "This key is already registered for your account",
        isDuplicate: true,
      };
    }

    const result = await db
      .insert(keyToUserTable)
      .values({
        publicKey: keyData.publicKey,
        keyType: keyData.keyType,
        userUuid: keyData.userUuid,
        keySigningUuid: keyData.keySigningUuid,
        metadata: metadata,
      })
      .returning();

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to store user key:", error);

    // Handle specific database errors
    if (
      error instanceof Error &&
      error.message.includes("duplicate key value")
    ) {
      return {
        success: false,
        error: "This key is already registered in the system",
        isDuplicate: true,
      };
    }

    return { success: false, error: "Failed to store key in database" };
  }
}

async function collectDeviceMetadata(): Promise<DeviceMetadata> {
  try {
    const headersList = await headers();

    // Extract IP address from various headers (handles proxy scenarios)
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const cfConnectingIp = headersList.get("cf-connecting-ip");

    let ipAddress = "unknown";
    if (cfConnectingIp) {
      ipAddress = cfConnectingIp.split(",")[0]!.trim();
    } else if (realIp) {
      ipAddress = realIp.split(",")[0]!.trim();
    } else if (forwardedFor) {
      ipAddress = forwardedFor.split(",")[0]!.trim();
    }

    // Extract user agent
    const userAgent = headersList.get("user-agent") || "unknown";

    return {
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
      source: "webapp",
    };
  } catch (error) {
    console.warn("Failed to collect device metadata:", error);
    return {
      ipAddress: "unknown",
      userAgent: "unknown",
      timestamp: new Date().toISOString(),
      source: "webapp",
    };
  }
}

export async function getUserKeys(userUuid: string) {
  try {
    const keys = await db
      .select()
      .from(keyToUserTable)
      .where(eq(keyToUserTable.userUuid, userUuid))
      .orderBy(keyToUserTable.createdAt);

    return { success: true, data: keys };
  } catch (error) {
    console.error("Failed to get user keys:", error);
    return { success: false, error: "Failed to retrieve keys" };
  }
}

export async function deleteUserKey(publicKey: string, userUuid: string) {
  try {
    const result = await db
      .delete(keyToUserTable)
      .where(
        and(
          eq(keyToUserTable.publicKey, publicKey),
          eq(keyToUserTable.userUuid, userUuid)
        )
      )
      .returning();

    if (result.length === 0) {
      return { success: false, error: "Key not found or not owned by user" };
    }

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to delete user key:", error);
    return { success: false, error: "Failed to delete key" };
  }
}

export async function deleteUserKeyById(keyId: number, userUuid: string) {
  try {
    const result = await db
      .delete(keyToUserTable)
      .where(
        and(eq(keyToUserTable.id, keyId), eq(keyToUserTable.userUuid, userUuid))
      )
      .returning();

    if (result.length === 0) {
      return { success: false, error: "Key not found or not owned by user" };
    }

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to delete user key by ID:", error);
    return { success: false, error: "Failed to delete key" };
  }
}

export async function signUserUuidWithPrivateKey(
  userUuid: string,
  privateKey: string
) {
  try {
    // Create the message to sign
    const message = `I am ${userUuid} and I am updating my public key`;

    // Sign the message using VIEM
    const signature = await signMessage({
      message,
      privateKey: privateKey as `0x${string}`,
    });

    return { success: true, signature };
  } catch (error) {
    console.error("Failed to sign user UUID with private key:", error);
    return { success: false, error: "Failed to sign message with private key" };
  }
}
