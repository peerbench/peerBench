import { withTxOrDb } from "@/database/helpers";
import { paginateQuery } from "@/database/query";
import {
  promptSetsTable,
  promptSetTagsTable,
  promptsTable,
  providerModelsTable,
  userRoleOnPromptSetTable,
} from "@/database/schema";
import { UserRoleOnPromptSet } from "@/database/types";
import { ADMIN_USER_ID, NULL_UUID } from "@/lib/constants";
import { DbOptions, PaginationOptions } from "@/types/db";
import {
  PromptSetAccessReason,
  PromptSetAccessReasons,
} from "@/types/prompt-set";
import {
  and,
  asc,
  count,
  countDistinct,
  eq,
  ilike,
  inArray,
  or,
  SQL,
  sql,
} from "drizzle-orm";

export class FilterService {
  static async getPromptSetCategories(
    options?: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
      }
  ) {
    return withTxOrDb(async (tx) => {
      let query = tx
        .select({ category: promptSetsTable.category })
        .from(promptSetsTable)
        .groupBy(promptSetsTable.category)
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [];

      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID
      ) {
        query = query.leftJoin(
          userRoleOnPromptSetTable,
          and(
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
            eq(userRoleOnPromptSetTable.userId, options.requestedByUserId)
          )
        );

        whereConditions.push(
          or(
            eq(promptSetsTable.isPublic, true),
            inArray(userRoleOnPromptSetTable.role, [
              UserRoleOnPromptSet.owner,
              UserRoleOnPromptSet.admin,
              UserRoleOnPromptSet.collaborator,
              UserRoleOnPromptSet.reviewer,
            ])
          )
        );
      }

      query = query.where(and(...whereConditions));

      const mainQuery = query.as("main_query");
      return await paginateQuery(
        query,
        tx
          .select({ count: countDistinct(mainQuery.category) })
          .from(mainQuery)
          .$dynamic(),
        {
          page: options?.page,
          pageSize: options?.pageSize,
          convertData: (data) => data.map((item) => item.category),
        }
      );
    }, options?.tx);
  }

  static async getPromptSetTags(
    options?: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
      }
  ) {
    return withTxOrDb(async (tx) => {
      let query = tx
        .select({ tag: promptSetTagsTable.tag })
        .from(promptSetTagsTable)
        .groupBy(promptSetTagsTable.tag)
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [];
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID
      ) {
        query = query
          .leftJoin(
            promptSetsTable,
            eq(promptSetsTable.id, promptSetTagsTable.promptSetId)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            and(
              eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
              eq(userRoleOnPromptSetTable.userId, options.requestedByUserId)
            )
          );

        whereConditions.push(
          or(
            eq(promptSetsTable.isPublic, true),
            inArray(userRoleOnPromptSetTable.role, [
              UserRoleOnPromptSet.owner,
              UserRoleOnPromptSet.admin,
              UserRoleOnPromptSet.collaborator,
              UserRoleOnPromptSet.reviewer,
            ])
          )
        );
      }

      query = query.where(and(...whereConditions));

      const mainQuery = query.as("main_query");
      return await paginateQuery(
        query,
        tx
          .select({ count: countDistinct(mainQuery.tag) })
          .from(mainQuery)
          .$dynamic(),
        {
          page: options?.page,
          pageSize: options?.pageSize,
          convertData: (data) => data.map((item) => item.tag),
        }
      );
    }, options?.tx);
  }

  static async getModelSlugs(
    options?: DbOptions &
      PaginationOptions & {
        search?: string;
      }
  ) {
    return withTxOrDb(async (tx) => {
      let query = tx
        .select({
          modelSlug: providerModelsTable.modelId,
        })
        .from(providerModelsTable)
        .groupBy(providerModelsTable.modelId)
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [];

      if (options?.search !== undefined) {
        whereConditions.push(
          ilike(providerModelsTable.modelId, `%${options.search}%`)
        );
      }

      query = query.where(and(...whereConditions));
      const countQuery = query.as("main_query");

      return await paginateQuery(
        query,
        tx
          .select({ count: countDistinct(countQuery.modelSlug) })
          .from(countQuery)
          .$dynamic(),
        {
          page: options?.page,
          pageSize: options?.pageSize,
          convertData: (data) => data.map((item) => item.modelSlug),
        }
      );
    }, options?.tx);
  }

  static async getPromptSets(
    options?: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        accessReason?: PromptSetAccessReason;
        filters?: { title?: string; id?: number };
      }
  ) {
    return withTxOrDb(async (tx) => {
      let query = tx
        .select({
          id: promptSetsTable.id,
          title: promptSetsTable.title,
        })
        .from(promptSetsTable)
        .groupBy(promptSetsTable.id, promptSetsTable.title)
        .$dynamic();
      let countQuery = tx
        .select({
          count: countDistinct(promptSetsTable.id),
        })
        .from(promptSetsTable)
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [];
      const orders: SQL<unknown>[] = [];

      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        query = query.leftJoin(
          userRoleOnPromptSetTable,
          and(
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
            eq(
              userRoleOnPromptSetTable.userId,
              options.requestedByUserId || NULL_UUID
            )
          )
        );
        countQuery = countQuery.leftJoin(
          userRoleOnPromptSetTable,
          and(
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
            eq(
              userRoleOnPromptSetTable.userId,
              options.requestedByUserId || NULL_UUID
            )
          )
        );

        switch (options?.accessReason) {
          case PromptSetAccessReasons.submitPrompt:
            whereConditions.push(
              or(
                and(
                  eq(promptSetsTable.isPublic, true),
                  eq(promptSetsTable.isPublicSubmissionsAllowed, true)
                ),
                inArray(userRoleOnPromptSetTable.role, [
                  UserRoleOnPromptSet.owner,
                  UserRoleOnPromptSet.admin,
                  UserRoleOnPromptSet.collaborator,
                ])
              )
            );
            break;
          case PromptSetAccessReasons.edit:
            whereConditions.push(
              inArray(userRoleOnPromptSetTable.role, [
                UserRoleOnPromptSet.owner,
                UserRoleOnPromptSet.admin,
              ])
            );
            break;
          case PromptSetAccessReasons.review:
            whereConditions.push(
              or(
                and(
                  eq(promptSetsTable.isPublic, true),
                  eq(promptSetsTable.isPublicSubmissionsAllowed, true)
                ),
                inArray(userRoleOnPromptSetTable.role, [
                  UserRoleOnPromptSet.owner,
                  UserRoleOnPromptSet.admin,
                  UserRoleOnPromptSet.collaborator,
                  UserRoleOnPromptSet.reviewer,
                ])
              )
            );
            break;

          default:
            whereConditions.push(
              or(
                eq(promptSetsTable.isPublic, true),
                inArray(userRoleOnPromptSetTable.role, [
                  UserRoleOnPromptSet.owner,
                  UserRoleOnPromptSet.admin,
                  UserRoleOnPromptSet.collaborator,
                  UserRoleOnPromptSet.reviewer,
                ])
              )
            );
            break;
        }

        orders.push(
          sql`
            COUNT(
              CASE
                WHEN ${userRoleOnPromptSetTable.role} = ${UserRoleOnPromptSet.owner} THEN 4
                WHEN ${userRoleOnPromptSetTable.role} = ${UserRoleOnPromptSet.admin} THEN 3
                WHEN ${userRoleOnPromptSetTable.role} = ${UserRoleOnPromptSet.collaborator} THEN 2
                WHEN ${userRoleOnPromptSetTable.role} = ${UserRoleOnPromptSet.reviewer} THEN 1
              END
            ) DESC
          `,
          asc(promptSetsTable.title)
        );
      } else {
        orders.push(asc(promptSetsTable.title));
      }

      // Apply filters
      if (options?.filters?.title !== undefined) {
        whereConditions.push(
          ilike(promptSetsTable.title, `%${options.filters.title}%`)
        );
      }
      if (options?.filters?.id !== undefined) {
        whereConditions.push(eq(promptSetsTable.id, options.filters.id));
      }

      return await paginateQuery(
        query.where(and(...whereConditions)).orderBy(...orders),
        countQuery.where(and(...whereConditions)),
        {
          page: options?.page,
          pageSize: options?.pageSize,
        }
      );
    }, options?.tx);
  }

  static async getPromptTags(
    options?: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        filters?: { tag?: string };
      }
  ) {
    return withTxOrDb(async (tx) => {
      const sq = tx
        .$with("prompt_tags_sq")
        .as(tx.select({ tag: this.promptTagAggregation() }).from(promptsTable));
      const query = tx
        .with(sq)
        .select({ tag: sq.tag })
        .from(sq)
        .orderBy(asc(sq.tag))
        .$dynamic();
      const countQuery = tx
        .with(sq)
        .select({ count: count() })
        .from(sq)
        .$dynamic();

      const whereConditions: (SQL<unknown> | undefined)[] = [];

      if (options?.filters?.tag !== undefined) {
        whereConditions.push(ilike(sq.tag, `%${options.filters.tag}%`));
      }

      return await paginateQuery(
        query.where(and(...whereConditions)),
        countQuery.where(and(...whereConditions)),
        {
          page: options?.page,
          pageSize: options?.pageSize,

          // We have aggregated the data so there is only one row
          convertData: (data) => data.map((item) => item.tag),
        }
      );
    });
  }

  // Query builders
  static promptTagAggregation(asName = "tag") {
    return sql<string>`
      DISTINCT jsonb_array_elements_text(
        COALESCE(${promptsTable.metadata}->'tags', '[]'::jsonb) ||
        COALESCE(${promptsTable.metadata}->'generatorTags', '[]'::jsonb) ||
        COALESCE(${promptsTable.metadata}->'articleTags', '[]'::jsonb) ||
        COALESCE(${promptsTable.metadata}->'sourceTags', '[]'::jsonb)
      )
    `.as(asName);
  }
}

export type PromptSetFilter = Awaited<
  ReturnType<typeof FilterService.getPromptSets>
>["data"][number];

export type PromptTagFilter = Awaited<
  ReturnType<typeof FilterService.getPromptTags>
>["data"][number];
