import { excluded, withTxOrDb } from "@/database/helpers";
import { knownModelsTable, providerModelsTable } from "@/database/schema";
import { DbOptions } from "@/types/db";
import {
  and,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  SQL,
} from "drizzle-orm";

export class ModelService {
  static async upsertProviderModels(
    data: {
      provider: string;
      modelId: string;
      perMillionTokenInputCost?: string;
      perMillionTokenOutputCost?: string;
      name?: string;
      host?: string;
      owner?: string;
    }[],
    options?: DbOptions
  ) {
    return withTxOrDb(async (tx) => {
      return await tx
        .insert(providerModelsTable)
        .values(
          data.map((m) => ({
            provider: m.provider,
            modelId: m.modelId,
            perMillionTokenInputCost: m.perMillionTokenInputCost,
            perMillionTokenOutputCost: m.perMillionTokenOutputCost,

            // TODO: These columns will be removed in the future.
            name: m.name ?? "unknown",
            host: m.host ?? "auto",
            owner: m.owner ?? "unknown",
          }))
        )
        .onConflictDoUpdate({
          target: [providerModelsTable.modelId],
          set: {
            // Only update token costs if the new value is greater than
            // the current value that we have in the database.
            perMillionTokenInputCost: sql`
              CASE WHEN
                ${and(
                  isNotNull(
                    excluded(providerModelsTable.perMillionTokenInputCost)
                  ),
                  or(
                    isNull(providerModelsTable.perMillionTokenInputCost),
                    gt(
                      excluded(providerModelsTable.perMillionTokenInputCost),
                      providerModelsTable.perMillionTokenInputCost
                    )
                  )
                )} THEN
                  ${excluded(providerModelsTable.perMillionTokenInputCost)}
              ELSE
                ${providerModelsTable.perMillionTokenInputCost}
              END
            `,
            perMillionTokenOutputCost: sql`
              CASE WHEN
                ${and(
                  isNotNull(
                    excluded(providerModelsTable.perMillionTokenOutputCost)
                  ),
                  or(
                    isNull(providerModelsTable.perMillionTokenOutputCost),
                    gt(
                      excluded(providerModelsTable.perMillionTokenOutputCost),
                      providerModelsTable.perMillionTokenOutputCost
                    )
                  )
                )} THEN
                  ${excluded(providerModelsTable.perMillionTokenOutputCost)}
              ELSE
                  ${providerModelsTable.perMillionTokenOutputCost}
              END
            `,
            updatedAt: new Date(),
          },
        })
        .returning();
    }, options?.tx);
  }

  static async getProviderModels(
    options?: DbOptions & {
      filters?: {
        providerAndModelId?: { provider: string; modelId: string }[];
        provider?: string[];
        name?: string[];
        host?: string[];
        owner?: string[];
        modelId?: string[];
      };
    }
  ) {
    return withTxOrDb(async (tx) => {
      const query = tx
        .select({
          id: providerModelsTable.id,
          provider: providerModelsTable.provider,
          modelId: providerModelsTable.modelId,
          perMillionTokenInputCost:
            providerModelsTable.perMillionTokenInputCost,
          perMillionTokenOutputCost:
            providerModelsTable.perMillionTokenOutputCost,

          knownModelId: knownModelsTable.id,
          knownModelName: knownModelsTable.name,
          knownModelOwner: knownModelsTable.owner,
        })
        .from(providerModelsTable)
        .leftJoin(
          knownModelsTable,
          eq(providerModelsTable.knownModelId, knownModelsTable.id)
        )
        .$dynamic();

      const whereConditions: (SQL<unknown> | undefined)[] = [];

      if (
        options?.filters?.providerAndModelId &&
        options.filters.providerAndModelId.length > 0
      ) {
        whereConditions.push(
          or(
            ...options.filters.providerAndModelId.map((m) =>
              and(
                eq(providerModelsTable.provider, m.provider),
                eq(providerModelsTable.modelId, m.modelId)
              )
            )
          )
        );
      }
      if (options?.filters?.provider && options.filters.provider.length > 0) {
        whereConditions.push(
          inArray(providerModelsTable.provider, options.filters.provider)
        );
      }
      if (options?.filters?.name && options.filters.name.length > 0) {
        whereConditions.push(
          inArray(providerModelsTable.name, options.filters.name)
        );
      }
      if (options?.filters?.host && options.filters.host.length > 0) {
        whereConditions.push(
          inArray(providerModelsTable.host, options.filters.host)
        );
      }
      if (options?.filters?.owner && options.filters.owner.length > 0) {
        whereConditions.push(
          inArray(providerModelsTable.owner, options.filters.owner)
        );
      }
      if (options?.filters?.modelId && options.filters.modelId.length > 0) {
        whereConditions.push(
          inArray(providerModelsTable.modelId, options.filters.modelId)
        );
      }

      return await query.where(and(...whereConditions));
    }, options?.tx);
  }
}

export type GetProviderModelsReturnItem = Awaited<
  ReturnType<typeof ModelService.getProviderModels>
>[number];
