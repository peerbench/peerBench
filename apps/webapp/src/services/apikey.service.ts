import { withTxOrDb, withTxOrTx } from "@/database/helpers";
import { apiKeysTable } from "@/database/schema";
import { ApiKeyProvider, ApiKeyProviders } from "@/database/types";
import { ApiError } from "@/errors/api-error";
import { DbOptions } from "@/types/db";
import { tryReadResponse } from "@/utils/try-read-response";
import { and, desc, eq } from "drizzle-orm";
import { randomBytes } from "crypto";

const OPENROUTER_API_KEY_PROVISIONING_URL = "https://openrouter.ai/api/v1/keys";
const OPENROUTER_API_KEY_USAGE_LIMIT = 1; // $1
const OPENROUTER_API_KEY_USAGE_LIMIT_RESET = "monthly";

export class ApiKeyService {
  static async insertApiKey(
    data: {
      key: string;
      assignedUserId: string;
      provider: ApiKeyProvider;
      metadata?: any;
    },
    options?: DbOptions
  ) {
    return withTxOrDb(async (tx) => {
      const [apiKey] = await tx
        .insert(apiKeysTable)
        .values({
          key: data.key,
          assignedUserId: data.assignedUserId,
          provider: data.provider,
          metadata: data.metadata,
        })
        .returning();

      return apiKey!;
    }, options?.tx);
  }

  static async getApiKeyByAssignedUserId(
    options: DbOptions & {
      assignedUserId: string;
      provider: ApiKeyProvider;
    }
  ) {
    return withTxOrDb(async (tx) => {
      const [apiKey] = await tx
        .select()
        .from(apiKeysTable)
        .where(
          and(
            eq(apiKeysTable.assignedUserId, options.assignedUserId),
            eq(apiKeysTable.provider, options.provider)
          )
        )
        .limit(1);

      return apiKey;
    }, options?.tx);
  }

  static async getAllApiKeysByUser(
    options: DbOptions & {
      assignedUserId: string;
      provider: ApiKeyProvider;
    }
  ) {
    return withTxOrDb(async (tx) => {
      const apiKeys = await tx
        .select()
        .from(apiKeysTable)
        .where(
          and(
            eq(apiKeysTable.assignedUserId, options.assignedUserId),
            eq(apiKeysTable.provider, options.provider)
          )
        )
        .orderBy(desc(apiKeysTable.createdAt));

      return apiKeys;
    }, options?.tx);
  }

  static async getApiKeyByKey(
    key: string,
    options?: DbOptions
  ) {
    return withTxOrDb(async (tx) => {
      const [apiKey] = await tx
        .select()
        .from(apiKeysTable)
        .where(eq(apiKeysTable.key, key))
        .limit(1);

      return apiKey;
    }, options?.tx);
  }

  static async deleteApiKey(
    id: number,
    assignedUserId: string,
    options?: DbOptions
  ) {
    return withTxOrDb(async (tx) => {
      const [deleted] = await tx
        .delete(apiKeysTable)
        .where(
          and(
            eq(apiKeysTable.id, id),
            eq(apiKeysTable.assignedUserId, assignedUserId)
          )
        )
        .returning();

      return deleted;
    }, options?.tx);
  }

  static async upsertOpenRouterApiKey(
    data: { assignedUserId: string },
    options?: DbOptions
  ) {
    return withTxOrTx(async (tx) => {
      const existingApiKey = await this.getApiKeyByAssignedUserId({
        assignedUserId: data.assignedUserId,
        provider: ApiKeyProviders.openrouter,
        tx,
      });

      if (existingApiKey) {
        return existingApiKey;
      }

      // Create an API key for the user using the OpenRouter provider
      const response = await fetch(OPENROUTER_API_KEY_PROVISIONING_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_PROVISIONING_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `peerBench-user-${data.assignedUserId}`,
          limit: OPENROUTER_API_KEY_USAGE_LIMIT,
          limit_reset: OPENROUTER_API_KEY_USAGE_LIMIT_RESET,
        }),
      });

      if (!response.ok) {
        console.error(await tryReadResponse(response));
        throw ApiError.server(`The API key provisioning failed`);
      }

      const keyData: OpenRouterApiKeyProvisioningResponse =
        await response.json();

      return this.insertApiKey(
        {
          key: keyData.key,
          assignedUserId: data.assignedUserId,
          provider: ApiKeyProviders.openrouter,
          metadata: keyData.data,
        },
        { tx }
      );
    }, options?.tx);
  }

  /**
   * Generate a new PeerBench API key
   * Format: pb_<40 random hex chars>
   */
  static generatePeerBenchApiKey(): string {
    const randomHex = randomBytes(20).toString("hex");
    return `pb_${randomHex}`;
  }

  /**
   * Create a new PeerBench API key for a user
   */
  static async createPeerBenchApiKey(
    data: { assignedUserId: string; name?: string },
    options?: DbOptions
  ) {
    const key = this.generatePeerBenchApiKey();

    return this.insertApiKey(
      {
        key,
        assignedUserId: data.assignedUserId,
        provider: ApiKeyProviders.peerbench,
        metadata: {
          name: data.name || `API Key ${new Date().toISOString().split("T")[0]}`,
          createdAt: new Date().toISOString(),
        },
      },
      options
    );
  }

  /**
   * List all PeerBench API keys for a user (with masked keys)
   */
  static async listPeerBenchApiKeys(
    assignedUserId: string,
    options?: DbOptions
  ) {
    const apiKeys = await this.getAllApiKeysByUser({
      assignedUserId,
      provider: ApiKeyProviders.peerbench,
      ...options,
    });

    // Mask the keys for security (show only first 8 and last 4 characters)
    return apiKeys.map((key) => ({
      ...key,
      key: this.maskApiKey(key.key),
    }));
  }

  /**
   * Mask an API key for display
   * Example: pb_abc...xyz
   */
  static maskApiKey(key: string): string {
    if (key.length <= 12) return key;
    const prefix = key.substring(0, 8); // pb_xxxxx
    const suffix = key.substring(key.length - 4); // last 4 chars
    return `${prefix}...${suffix}`;
  }

  /**
   * Validate a PeerBench API key and return the user ID
   */
  static async validatePeerBenchApiKey(
    key: string,
    options?: DbOptions
  ): Promise<string | null> {
    if (!key.startsWith("pb_")) {
      return null;
    }

    const apiKey = await this.getApiKeyByKey(key, options);

    if (!apiKey || apiKey.provider !== ApiKeyProviders.peerbench) {
      return null;
    }

    return apiKey.assignedUserId;
  }
}

export type OpenRouterApiKeyProvisioningResponse = {
  key: string;
  data: {
    hash: string;
    name: string;
    label: string;
    disabled: boolean;
    limit: number;
    limit_remaining: number;
    limit_reset: string;
    include_byok_in_limit: boolean;
    usage: number;
    usage_daily: number;
    usage_weekly: number;
    usage_monthly: number;
    byok_usage: number;
    byok_usage_daily: number;
    byok_usage_weekly: number;
    byok_usage_monthly: number;
    created_at: string;
    updated_at: string | null;
  };
};
