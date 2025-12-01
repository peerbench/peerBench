import {
  aliasedTable,
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  or,
  SQL,
  sql,
} from "drizzle-orm";
import {
  promptsTable,
  promptSetsTable,
  userRoleOnPromptSetTable,
  promptSetTagsTable,
  userProfileTable,
  promptSetInvitationsTable,
  promptSetPrompts,
  hashRegistrationsTable,
  responsesTable,
  scoresTable,
  orgToPeopleTable,
  orgsTable,
  promptSetStatsView,
  reviewContributorsPerPromptSetView,
  uploadContributorsPerPromptSetView,
  usersView,
} from "@/database/schema";
import { DbOptions, DbTx, PaginationOptions } from "@/types/db";
import { excluded, exists1, withTxOrDb, withTxOrTx } from "@/database/helpers";
import { PromptType } from "peerbench";
import { paginateQuery } from "@/database/query";
import {
  PromptSetLicense,
  PromptStatus,
  PromptStatuses,
  UserRoleOnPromptSet,
} from "@/database/types";
import { PgColumn, unionAll } from "drizzle-orm/pg-core";
import { ApiError } from "@/errors/api-error";
import { randomBytes } from "node:crypto";
import { authUsers } from "drizzle-orm/supabase";
import {
  PromptSetAccessReason,
  PromptSetAccessReasons,
  PromptSetOrdering,
  PromptSetOrderings,
} from "@/types/prompt-set";
import { ADMIN_USER_ID, NULL_UUID } from "@/lib/constants";
import { promptFiltersSchema } from "@/validation/api/prompt-filters";
import { z } from "zod";
import { PromptService } from "./prompt.service";
import { promptSetFiltersSchema } from "@/validation/prompt-set-filters";

export class PromptSetService {
  /**
   * Inserts a new Prompt Set
   */
  static async insertPromptSet(
    data: {
      title: string;
      ownerId: string;
      description?: string;
      license?: PromptSetLicense;
      category?: string;
      citationInfo?: string;
      isPublic?: boolean;
      isPublicSubmissionsAllowed?: boolean;
      promptsToInclude?: z.infer<typeof promptFiltersSchema>;
    },
    options?: DbOptions
  ) {
    return withTxOrTx(async (tx) => {
      // Insert the Prompt Set
      const promptSet = await tx
        .insert(promptSetsTable)
        .values({
          title: data.title,
          description: data.description,
          ownerId: data.ownerId,
          license: data.license,
          category: data.category,
          citationInfo: data.citationInfo,
          isPublic: data.isPublic,
          isPublicSubmissionsAllowed: data.isPublicSubmissionsAllowed,
          metadata: {
            type: data.promptsToInclude ? `curated` : `default`,
          },
        })
        .returning({
          id: promptSetsTable.id,
          title: promptSetsTable.title,
          description: promptSetsTable.description,
          ownerId: promptSetsTable.ownerId,
          license: promptSetsTable.license,
          category: promptSetsTable.category,
          citationInfo: promptSetsTable.citationInfo,
          isPublic: promptSetsTable.isPublic,
          isPublicSubmissionsAllowed:
            promptSetsTable.isPublicSubmissionsAllowed,
        })
        .then((result) => result[0]!);

      // Insert role of the owner for the new Prompt Set
      await tx
        .insert(userRoleOnPromptSetTable)
        .values({
          userId: data.ownerId,
          promptSetId: promptSet.id,
          role: UserRoleOnPromptSet.owner,
        })
        .returning();

      // Insert the Prompts that matches with the given filters (if there are)
      if (data.promptsToInclude) {
        await this.includePrompts({
          tx,
          requestedByUserId: data.ownerId,
          promptSetId: promptSet.id,
          filters: data.promptsToInclude,

          // Prompt Set is fresh so no need to check permissions
          checkPromptSetPermissions: false,
        });
      }

      return promptSet;
    }, options?.tx);
  }

  static async deletePromptSet(
    options: DbOptions<false> & {
      filters: {
        id: number;
      };
      requestedByUserId?: string;
    }
  ) {
    return withTxOrTx(async (tx) => {
      let query = tx
        .update(promptSetsTable)
        .set({
          deletedAt: sql`NOW()`,
        })
        .$dynamic();

      let aclCondition = and();
      if (
        options.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        // Get the user's role for the Prompt Set
        const { role } = await tx
          .select({
            role: userRoleOnPromptSetTable.role,
          })
          .from(userRoleOnPromptSetTable)
          .where(
            and(
              eq(userRoleOnPromptSetTable.userId, options.requestedByUserId),
              eq(userRoleOnPromptSetTable.promptSetId, options.filters.id)
            )
          )
          .then((result) => result[0] || { role: null });

        // Only Owner is allowed to delete the Prompt Set
        if (role !== UserRoleOnPromptSet.owner) {
          throw ApiError.forbidden();
        }

        query = query.from(userRoleOnPromptSetTable);
        aclCondition = and(
          // Join with ID column
          eq(promptSetsTable.id, userRoleOnPromptSetTable.promptSetId),

          // User should have a role...
          eq(userRoleOnPromptSetTable.userId, options.requestedByUserId),

          // ...and the role must be "owner"
          eq(userRoleOnPromptSetTable.role, UserRoleOnPromptSet.owner)
        );
      }

      // Mark the Prompt Set as deleted
      await query.where(
        and(eq(promptSetsTable.id, options.filters.id), aclCondition)
      );
    }, options?.tx);
  }

  static async updatePromptSet(
    data: {
      title?: string;
      description?: string;
      license?: PromptSetLicense;
      category?: string;
      citationInfo?: string;
      isPublic?: boolean;
      isPublicSubmissionsAllowed?: boolean;
      tags?: string[];
    },
    options: DbOptions<false> & {
      filters: {
        id: number;
      };
      requestedByUserId?: string;
    }
  ) {
    return withTxOrTx(async (tx) => {
      const whereConditions = [eq(promptSetsTable.id, options.filters.id)];

      // Check the existence of the Prompt Set
      const promptSet = await tx
        .select()
        .from(promptSetsTable)
        .where(and(...whereConditions))
        .then((result) => result[0]);

      if (!promptSet) {
        throw ApiError.notFound("Benchmark not found");
      }

      // If caller is trying to change public submissions allowance while the Prompt Set
      // is not public (and not made the Prompt Set public), that is a no no.
      if (
        data.isPublicSubmissionsAllowed === true &&
        // Public submissions are allowed only if the Prompt Set is public
        (data.isPublic ?? promptSet.isPublic) === false
      ) {
        throw ApiError.badRequest(
          "Public submissions are allowed only if the Benchmark is public"
        );
      }

      let query = tx
        .update(promptSetsTable)
        .set({
          ...data,
          updatedAt: sql`NOW()`,
        })
        .$dynamic();

      let aclCondition = and();
      if (
        options.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        // Get the user's role for the Prompt Set
        const { role } = await tx
          .select({
            role: userRoleOnPromptSetTable.role,
          })
          .from(userRoleOnPromptSetTable)
          .where(
            and(
              eq(userRoleOnPromptSetTable.userId, options.requestedByUserId),
              eq(userRoleOnPromptSetTable.promptSetId, options.filters.id)
            )
          )
          .then((result) => result[0] || { role: null });

        if (
          // TODO: Should we allow Admins to update the Prompt Set?
          role !== UserRoleOnPromptSet.admin &&
          role !== UserRoleOnPromptSet.owner
        ) {
          throw ApiError.forbidden();
        }

        query = query.from(userRoleOnPromptSetTable);
        aclCondition = and(
          // Join with ID column
          eq(promptSetsTable.id, userRoleOnPromptSetTable.promptSetId),

          // User should have a role...
          eq(userRoleOnPromptSetTable.userId, options.requestedByUserId),

          // ...and the role must be "admin" or "owner"
          inArray(userRoleOnPromptSetTable.role, [
            UserRoleOnPromptSet.admin,
            UserRoleOnPromptSet.owner,
          ])
        );
      }

      if (data.tags) {
        // Clear all the current tags
        await tx
          .delete(promptSetTagsTable)
          .where(eq(promptSetTagsTable.promptSetId, options.filters.id));

        // Insert the new given ones
        if (data.tags.length > 0) {
          await tx.insert(promptSetTagsTable).values(
            data.tags.map((tag) => ({
              promptSetId: options.filters.id,
              tag,
            }))
          );
        }
      }

      // Update the Prompt Set
      await query.where(and(...whereConditions, aclCondition));
    }, options?.tx);
  }

  static async checkUserPermissionOnPromptSet(
    options: DbOptions & {
      requestedByUserId: string;
      promptSetId: number;

      canSubmitPrompts?: boolean;
      // TODO: Expand this and share the usage among the services
      // canReviewPrompts?: boolean;
      // canEditPromptSet?: boolean;
      // canDeletePromptSet?: boolean;
      // canInviteUsers?: boolean;
      // canViewPromptSet?: boolean;
    }
  ) {
    return withTxOrDb(async (tx) => {
      // Bypass ACL rules for admin user
      if (options.requestedByUserId === ADMIN_USER_ID) {
        return;
      }

      // Retrieve Prompt Set info and User's role on the Prompt Set
      const [promptSet, userRole] = await Promise.all([
        tx
          .select({
            isPublic: promptSetsTable.isPublic,
            isPublicSubmissionsAllowed:
              promptSetsTable.isPublicSubmissionsAllowed,
          })
          .from(promptSetsTable)
          .where(eq(promptSetsTable.id, options.promptSetId))
          .then((result) => result[0]),
        tx
          .select({ role: userRoleOnPromptSetTable.role })
          .from(userRoleOnPromptSetTable)
          .where(
            and(
              eq(userRoleOnPromptSetTable.userId, options.requestedByUserId),
              eq(userRoleOnPromptSetTable.promptSetId, options.promptSetId)
            )
          )
          .then((result) => result[0]),
      ]);

      if (!promptSet) {
        throw ApiError.notFound("Benchmark not found");
      }

      if (options.canSubmitPrompts) {
        if (!promptSet.isPublicSubmissionsAllowed) {
          if (
            userRole?.role !== UserRoleOnPromptSet.owner &&
            userRole?.role !== UserRoleOnPromptSet.admin &&
            userRole?.role !== UserRoleOnPromptSet.collaborator
          ) {
            throw ApiError.forbidden();
          }
        }
      }
    }, options?.tx);
  }

  /**
   * Same as `getPromptSets` method but returns a single item.
   */
  static async getPromptSet(
    options: DbOptions & {
      filters: {
        id?: number;
        title?: string;
      };
      requestReason?: PromptSetAccessReason;
      requestedByUserId?: string;
    }
  ) {
    return await withTxOrDb(async (tx) => {
      const result = await this.getPromptSets({
        page: 1,
        pageSize: 1,
        requestedByUserId: options.requestedByUserId,
        filters: {
          id: options.filters?.id,
          title: options.filters?.title,
          accessReason: options.requestReason,
        },
        tx,
      });

      return result.data[0];
    }, options?.tx);
  }

  /**
   * Retrieves Prompt Sets that match with the given filters. Applies
   * access control rules if `requestedByUserId` is provided and more
   * filtering on the ACL applied results if `requestReason` is provided.
   */
  static async getPromptSets(
    options?: DbOptions &
      PaginationOptions & {
        filters?: z.infer<typeof promptSetFiltersSchema>;

        orderBy?: Record<PromptSetOrdering, "asc" | "desc">;

        /**
         * Caller user ID of the method. Will be used to apply access control rules if provided.
         */
        requestedByUserId?: string;
      }
  ) {
    return await withTxOrDb(async (tx) => {
      const permissions = sql<{
        canDelete: boolean;
        canEdit: boolean;
      }>`
        jsonb_build_object(
          'canDelete',
            ${
              options?.requestedByUserId === ADMIN_USER_ID // ACL rules doesn't apply to admin user
                ? sql.raw("true")
                : eq(userRoleOnPromptSetTable.role, UserRoleOnPromptSet.owner)
            },
          'canEdit', ${
            options?.requestedByUserId === ADMIN_USER_ID // ACL rules doesn't apply to admin user
              ? sql.raw("true")
              : or(
                  eq(userRoleOnPromptSetTable.role, UserRoleOnPromptSet.owner),
                  eq(userRoleOnPromptSetTable.role, UserRoleOnPromptSet.admin)
                )
          }
        )
      `.as("permissions");

      let query = tx
        .select({
          id: promptSetsTable.id,
          title: promptSetsTable.title,
          description: promptSetsTable.description,
          ownerId: promptSetsTable.ownerId,
          createdAt: promptSetsTable.createdAt,
          updatedAt: promptSetsTable.updatedAt,
          license: promptSetsTable.license,
          category: promptSetsTable.category,
          citationInfo: promptSetsTable.citationInfo,
          isPublic: promptSetsTable.isPublic,
          isPublicSubmissionsAllowed:
            promptSetsTable.isPublicSubmissionsAllowed,

          // TODO: Count excluded Prompts separately

          totalPromptsCount: promptSetStatsView.includedPromptCount,
          totalContributors: promptSetStatsView.totalContributors,
          totalScoreCount: promptSetStatsView.totalScoreCount,
          overallAvgScore: promptSetStatsView.overallAvgScore,

          tags: sql<string[]>`
            COALESCE(
              jsonb_agg(DISTINCT ${promptSetTagsTable.tag}) FILTER (WHERE ${isNotNull(promptSetTagsTable.id)}),
              '[]'
            )
          `,
          includingPromptTypes: sql<PromptType[]>`
            COALESCE(
              jsonb_agg(
                DISTINCT ${promptsTable.type}
              ) FILTER (WHERE ${isNotNull(promptsTable.type)}),
              '[]'
            )
          `,

          permissions:
            options?.requestedByUserId !== undefined
              ? permissions
              : sql<null>`NULL`,
        })
        .from(promptSetsTable)
        .leftJoin(
          promptSetPrompts,
          and(
            eq(promptSetPrompts.promptSetId, promptSetsTable.id),
            eq(promptSetPrompts.status, PromptStatuses.included)
          )
        )
        .leftJoin(promptsTable, eq(promptsTable.id, promptSetPrompts.promptId))
        .leftJoin(
          promptSetStatsView,
          eq(promptSetsTable.id, promptSetStatsView.id)
        )
        .leftJoin(
          promptSetTagsTable,
          eq(promptSetsTable.id, promptSetTagsTable.promptSetId)
        )
        .$dynamic();

      const whereConditions: (SQL<unknown> | undefined)[] = [
        isNull(promptSetsTable.deletedAt), // Exclude deleted entries
      ];
      const groups: (PgColumn<any> | SQL.Aliased<any>)[] = [
        promptSetsTable.id,
        promptSetStatsView.totalContributors,
        promptSetStatsView.includedPromptCount,
        promptSetStatsView.totalScoreCount,
        promptSetStatsView.overallAvgScore,
      ];
      let orders: SQL<unknown>[] = [desc(promptSetsTable.updatedAt)];

      // Apply filters
      if (options?.filters?.ownerId !== undefined) {
        whereConditions.push(
          eq(promptSetsTable.ownerId, options.filters.ownerId)
        );
      }
      if (options?.filters?.id !== undefined) {
        whereConditions.push(eq(promptSetsTable.id, options.filters.id));
      }
      if (options?.filters?.title !== undefined) {
        whereConditions.push(eq(promptSetsTable.title, options.filters.title));
      }

      if (options?.filters?.search !== undefined) {
        whereConditions.push(
          or(
            like(
              sql`${promptSetsTable.id}::text`,
              `%${options.filters.search}%`
            ),
            ilike(promptSetsTable.title, `%${options.filters.search}%`),
            ilike(promptSetsTable.description, `%${options.filters.search}%`),
            ilike(promptSetsTable.citationInfo, `%${options.filters.search}%`)
          )
        );
      }

      if (
        options?.filters?.categories !== undefined &&
        options.filters.categories.length > 0
      ) {
        whereConditions.push(
          inArray(promptSetsTable.category, options.filters.categories)
        );
      }

      if (
        options?.filters?.tags !== undefined &&
        options.filters.tags.length > 0
      ) {
        whereConditions.push(
          exists1({
            from: promptSetTagsTable,
            where: and(
              eq(promptSetTagsTable.promptSetId, promptSetsTable.id),
              inArray(promptSetTagsTable.tag, options.filters.tags)
            ),
          })
        );
      }

      if (options?.filters?.visibility !== undefined) {
        if (options.filters.visibility === "public") {
          whereConditions.push(eq(promptSetsTable.isPublic, true));
        } else if (options.filters.visibility === "private") {
          whereConditions.push(eq(promptSetsTable.isPublic, false));
        }
      }

      // If the requested user is specified (which means this method is
      // called from an API handler function) then we need to apply
      // access control rules to the results.
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        const aclConditions = [];

        // Apply filters based on the request reason to have more relevant results.
        switch (options?.filters?.accessReason) {
          case PromptSetAccessReasons.submitPrompt:
            aclConditions.push(
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
          case PromptSetAccessReasons.review:
            aclConditions.push(
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
          case PromptSetAccessReasons.edit:
            aclConditions.push(
              inArray(userRoleOnPromptSetTable.role, [
                UserRoleOnPromptSet.owner,
                // TODO: Should we allow admin to edit the Prompt Set?
                UserRoleOnPromptSet.admin,
              ])
            );
            break;
          // If the reason is not specified, we can retrieve
          // all the Prompt Sets that user is allowed to "see"
          default:
            aclConditions.push(
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

        // Protection happens in the `where` clause so just join the tables here
        const joinCondition = and(
          eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
          eq(
            userRoleOnPromptSetTable.userId,

            // If `requestedByUserId` passed as an empty string (|| checks falsy values including empty string) that
            // means the caller wants to apply access control rules, but doesn't have an authenticated user. So simply
            // we pass `NULL` as a placeholder for user ID and that prevents private things to be included in the results.
            options?.requestedByUserId || NULL_UUID
          )
        );
        query = query.leftJoin(userRoleOnPromptSetTable, joinCondition);

        whereConditions.push(and(...aclConditions));
        groups.push(userRoleOnPromptSetTable.role);
        orders = [
          sql`
            CASE
              WHEN ${userRoleOnPromptSetTable.role} = ${UserRoleOnPromptSet.owner} THEN 0
              WHEN ${userRoleOnPromptSetTable.role} = ${UserRoleOnPromptSet.admin} THEN 1
              WHEN ${userRoleOnPromptSetTable.role} IS NOT NULL THEN 2
              ELSE 3
            END
          `,
          ...orders,
        ];
      }

      if (options?.orderBy) {
        const customOrders: SQL<unknown>[] = [];
        for (const [key, direction] of Object.entries(options.orderBy)) {
          const directionFn = direction === "asc" ? asc : desc;

          switch (key) {
            case PromptSetOrderings.mostRecent:
              customOrders.push(directionFn(promptSetsTable.updatedAt));
              break;
          }
        }

        // Custom order request is more prior than the default order
        orders = [...customOrders, ...orders];
      }

      query = query
        .groupBy(...groups)
        .orderBy(...orders)
        .where(and(...whereConditions));

      const countQuery = query.as("main_query");
      return await paginateQuery(
        query,
        tx
          .select({ count: countDistinct(countQuery.id) })
          .from(countQuery)
          .$dynamic(),
        {
          page: options?.page,
          pageSize: options?.pageSize,
        }
      );
    }, options?.tx);
  }

  /**
   * Returns the recent Prompt Set that the given user has joined.
   * Unlike `getPromptSets` method, this one doesn't provide too many
   * aggregated information about the Prompt Set.
   */
  static async getRecentJoinedPromptSet(
    options: DbOptions<false> & {
      userId: string;
    }
  ) {
    return await withTxOrDb(async (tx) => {
      const [promptSet] = await tx
        .select({
          id: promptSetsTable.id,
          title: promptSetsTable.title,
          description: promptSetsTable.description,
        })
        .from(promptSetsTable)
        .innerJoin(
          userRoleOnPromptSetTable,
          and(
            eq(promptSetsTable.id, userRoleOnPromptSetTable.promptSetId),
            eq(userRoleOnPromptSetTable.userId, options.userId)
          )
        )
        .orderBy(desc(promptSetsTable.createdAt))
        .limit(1);

      return promptSet;
    }, options?.tx);
  }

  /**
   * Returns the collaborators of the given Prompt Set. Collaborators are
   * the users who had contributed to the Prompt Set in any way (uploaded prompts, reviewed prompts, etc.)
   */
  static async getCollaborators(
    options: DbOptions &
      PaginationOptions & {
        promptSetId: number;

        /**
         * If true, then only counts the collaborators who were invited to the Prompt Set.
         */
        excludePublicCollaborators?: boolean;
        requestedByUserId?: string;
      }
  ) {
    return withTxOrDb(async (tx) => {
      const collaboratorsSubQuery = tx.$with("sq_collaborators").as((qb) => {
        const reviewCollaboratorsQuery = qb
          .select({
            promptSetId: reviewContributorsPerPromptSetView.promptSetId,
            userId: reviewContributorsPerPromptSetView.userId,
          })
          .from(reviewContributorsPerPromptSetView);

        const uploadCollaboratorsQuery = qb
          .select({
            promptSetId: uploadContributorsPerPromptSetView.promptSetId,
            userId: uploadContributorsPerPromptSetView.uploaderId,
          })
          .from(uploadContributorsPerPromptSetView);

        const contributorsQuery = qb
          .select({
            promptSetId: userRoleOnPromptSetTable.promptSetId,
            userId: userRoleOnPromptSetTable.userId,
          })
          .from(userRoleOnPromptSetTable);

        return contributorsQuery
          .union(uploadCollaboratorsQuery)
          .union(reviewCollaboratorsQuery);
      });

      // Use the user's display name and fallback to the masked email address
      const displayName = sql<string>`
        COALESCE(
          ${usersView.displayName},
          CONCAT(
            LEFT(split_part(${usersView.email}, '@', 1), 3),
            '*****@',
            split_part(${usersView.email}, '@', 2)
          )
        )
      `.as("display_name");

      let query = tx
        .with(collaboratorsSubQuery)
        .select({
          promptSetId: collaboratorsSubQuery.promptSetId,
          userId: collaboratorsSubQuery.userId,
          orgName: usersView.orgName,
          role: userRoleOnPromptSetTable.role,
          joinedAt: userRoleOnPromptSetTable.createdAt,
          displayName,
        })
        .from(collaboratorsSubQuery)
        .innerJoin(usersView, eq(usersView.id, collaboratorsSubQuery.userId))
        .leftJoin(
          userRoleOnPromptSetTable,
          and(
            eq(
              userRoleOnPromptSetTable.promptSetId,
              collaboratorsSubQuery.promptSetId
            ),
            eq(userRoleOnPromptSetTable.userId, collaboratorsSubQuery.userId)
          )
        )
        .groupBy(
          collaboratorsSubQuery.userId,
          collaboratorsSubQuery.promptSetId,
          usersView.displayName,
          usersView.email,
          usersView.orgName,
          userRoleOnPromptSetTable.role,
          userRoleOnPromptSetTable.createdAt
        )
        .orderBy(
          sql`
            CASE
              WHEN ${eq(userRoleOnPromptSetTable.role, UserRoleOnPromptSet.owner)} THEN 0
              WHEN ${eq(userRoleOnPromptSetTable.role, UserRoleOnPromptSet.admin)} THEN 1
              WHEN ${eq(userRoleOnPromptSetTable.role, UserRoleOnPromptSet.collaborator)} THEN 2
              WHEN ${eq(userRoleOnPromptSetTable.role, UserRoleOnPromptSet.reviewer)} THEN 3
              ELSE 4
            END
          `,
          asc(displayName)
        )
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [
        eq(collaboratorsSubQuery.promptSetId, options.promptSetId),
      ];

      if (
        options.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID
      ) {
        // Previous join was for getting the user roles on the target Prompt Set but this
        // one is for applying ACL rules for the caller user.
        const roleTable = aliasedTable(userRoleOnPromptSetTable, "roles");
        query = query
          .leftJoin(
            roleTable,
            eq(roleTable.userId, collaboratorsSubQuery.userId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetsTable.id, collaboratorsSubQuery.promptSetId)
          );

        whereConditions.push(
          or(
            eq(promptSetsTable.isPublic, true),
            inArray(roleTable.role, [
              UserRoleOnPromptSet.owner,
              UserRoleOnPromptSet.admin,
              UserRoleOnPromptSet.collaborator,
              UserRoleOnPromptSet.reviewer,
            ])
          )
        );
      }

      if (options?.excludePublicCollaborators) {
        whereConditions.push(isNotNull(userRoleOnPromptSetTable.role));
      }

      query = query.where(and(...whereConditions));

      const countQuery = query.as("main_query");
      return await paginateQuery(
        query,
        tx
          .select({ count: countDistinct(countQuery.userId) })
          .from(countQuery)
          .$dynamic(),
        {
          page: options.page,
          pageSize: options.pageSize,
        }
      );
    }, options?.tx);
  }

  static async getCoAuthors(
    options: DbOptions<false> &
      PaginationOptions & {
        promptSetId: number;

        filters?: {
          /**
           * If the target Prompt Set is public, that means it may have
           * bunch of public co-authors. If given `true`, then those public
           * co-authors will be excluded from the results even though Prompt
           * Set is marked as public.
           */
          excludePublicCoAuthors?: boolean;
        };

        /**
         * Caller user ID of the method. Will be used to apply access control rules if provided.
         */
        requestedByUserId?: string;
      }
  ) {
    return await withTxOrDb(async (tx) => {
      const whereConditions: (PgColumn<any> | SQL<any> | undefined)[] = [
        isNull(promptSetsTable.deletedAt), // exclude deleted Prompt Sets
      ];
      const contributionsQuery = this.buildContributionsQuery(tx);

      const query = tx
        .select({
          userId: contributionsQuery.userId,
          role: userRoleOnPromptSetTable.role,
          joinedAt: userRoleOnPromptSetTable.createdAt,
          // totalContributions: .....
          displayName: userProfileTable.displayName,
          email: authUsers.email,
          orgName: orgsTable.name,
        })
        .from(contributionsQuery)
        .leftJoin(
          userRoleOnPromptSetTable,
          and(
            // Only join if the user has a role on the Prompt Set
            eq(userRoleOnPromptSetTable.userId, contributionsQuery.userId),
            eq(
              userRoleOnPromptSetTable.promptSetId,
              contributionsQuery.promptSetId
            )
          )
        )
        .leftJoin(
          userProfileTable,
          eq(userProfileTable.userId, contributionsQuery.userId)
        )
        .leftJoin(
          orgToPeopleTable,
          eq(orgToPeopleTable.userId, contributionsQuery.userId)
        )
        .leftJoin(orgsTable, eq(orgsTable.id, orgToPeopleTable.orgId))
        .innerJoin(authUsers, eq(authUsers.id, contributionsQuery.userId))
        .innerJoin(
          promptSetsTable,
          eq(promptSetsTable.id, contributionsQuery.promptSetId)
        )
        .orderBy(
          sql`
            CASE
              WHEN ${userRoleOnPromptSetTable.role} = ${UserRoleOnPromptSet.owner} THEN 0
              WHEN ${userRoleOnPromptSetTable.role} = ${UserRoleOnPromptSet.admin} THEN 1
              WHEN ${userRoleOnPromptSetTable.role} = ${UserRoleOnPromptSet.collaborator} THEN 2
              WHEN ${userRoleOnPromptSetTable.role} = ${UserRoleOnPromptSet.reviewer} THEN 3
              ELSE 4
            END
          `
        )
        .groupBy(
          contributionsQuery.userId,
          userRoleOnPromptSetTable.role,
          userProfileTable.displayName,
          userRoleOnPromptSetTable.createdAt,
          authUsers.email,
          orgsTable.name
        )
        .$dynamic();
      let countQuery = tx
        .select({ count: countDistinct(contributionsQuery.userId) })
        .from(contributionsQuery)
        .innerJoin(
          promptSetsTable,
          eq(promptSetsTable.id, contributionsQuery.promptSetId)
        )
        .$dynamic();

      whereConditions.push(
        eq(contributionsQuery.promptSetId, options.promptSetId)
      );

      if (options.filters?.excludePublicCoAuthors) {
        // Exclude the contributors who don't have a role on the Prompt Set
        whereConditions.push(isNotNull(userRoleOnPromptSetTable.role));

        // Join the role table to the count query, so we can apply the same where condition
        countQuery = countQuery.leftJoin(
          userRoleOnPromptSetTable,
          and(
            // Only join if the user has a role on the Prompt Set
            eq(userRoleOnPromptSetTable.userId, contributionsQuery.userId),
            eq(
              userRoleOnPromptSetTable.promptSetId,
              contributionsQuery.promptSetId
            )
          )
        );
      }

      if (
        options.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        whereConditions.push(
          or(
            // Either if user has any of the roles that allow to view Prompt Set...
            sql`EXISTS (
              SELECT 1
              FROM ${userRoleOnPromptSetTable}
              WHERE ${userRoleOnPromptSetTable.role} IN (
                ${UserRoleOnPromptSet.owner},
                ${UserRoleOnPromptSet.admin},
                ${UserRoleOnPromptSet.collaborator},
                ${UserRoleOnPromptSet.reviewer}
              ) AND
              ${userRoleOnPromptSetTable.promptSetId} = ${options.promptSetId} AND
              ${userRoleOnPromptSetTable.userId} = ${options.requestedByUserId}
            )`,
            // ...or Prompt Set marked as public
            eq(promptSetsTable.isPublic, true)
          )
        );
      }

      return await paginateQuery(
        query.where(and(...whereConditions)),
        countQuery.where(and(...whereConditions)),
        {
          page: options.page,
          pageSize: options.pageSize,
        }
      );
    }, options?.tx);
  }

  static async updateCoAuthorRole(
    data: {
      newRole?: UserRoleOnPromptSet;
    },
    options: DbOptions & {
      promptSetId: number;
      coAuthorUserId: string;

      /**
       * Caller user ID of the method. Will be used to apply access control rules if provided.
       */
      requestedByUserId?: string;
    }
  ) {
    if (Object.keys(data).length === 0) {
      // No changes to be made
      return;
    }

    return withTxOrTx(async (tx) => {
      if (
        options.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        // Get roles of user and the co-author who is going to be updated
        const roles = await tx
          .select({
            userId: userRoleOnPromptSetTable.userId,
            role: userRoleOnPromptSetTable.role,
          })
          .from(userRoleOnPromptSetTable)
          .where(
            and(
              inArray(userRoleOnPromptSetTable.userId, [
                options.requestedByUserId,
                options.coAuthorUserId,
              ]),
              eq(userRoleOnPromptSetTable.promptSetId, options.promptSetId)
            )
          );

        // Extract roles into variables
        const { role: coAuthorUserRole } =
          roles.find((r) => r.userId === options.coAuthorUserId) || {};
        const { role: requestedByUserRole } =
          roles.find((r) => r.userId === options.requestedByUserId) || {};

        // Only Admins and Owners can update the role of other users from the Prompt Set
        if (
          requestedByUserRole !== UserRoleOnPromptSet.admin &&
          requestedByUserRole !== UserRoleOnPromptSet.owner
        ) {
          throw ApiError.forbidden();
        }

        // No one can update the role of Owner
        if (coAuthorUserRole === UserRoleOnPromptSet.owner) {
          throw ApiError.forbidden();
        }
      }

      // Update the role of the co-author
      await tx
        .update(userRoleOnPromptSetTable)
        .set({
          role: data.newRole,
          updatedAt: sql`NOW()`,
        })
        .where(
          and(
            eq(userRoleOnPromptSetTable.userId, options.coAuthorUserId),
            eq(userRoleOnPromptSetTable.promptSetId, options.promptSetId)
          )
        );
    }, options.tx);
  }

  static async getInvitations(
    options: DbOptions &
      PaginationOptions & {
        promptSetId: number;

        filters?: {
          excludeRevokedInvitations?: boolean;
          excludeUsedInvitations?: boolean;
        };

        /**
         * Caller user ID of the method. Will be used to apply access control rules if provided.
         */
        requestedByUserId?: string;
      }
  ) {
    return await withTxOrDb(async (tx) => {
      const whereConditions: (PgColumn<any> | SQL<any> | undefined)[] = [
        eq(promptSetInvitationsTable.promptSetId, options.promptSetId),
        isNull(promptSetsTable.deletedAt), // Exclude deleted Prompt Sets
      ];

      let query = tx
        .select({
          code: promptSetInvitationsTable.code,
          role: promptSetInvitationsTable.role,
          createdAt: promptSetInvitationsTable.createdAt,
          usedAt: promptSetInvitationsTable.usedAt,
          revokedAt: promptSetInvitationsTable.revokedAt,
          createdBy: promptSetInvitationsTable.createdBy,
          isReusable: promptSetInvitationsTable.isReusable,
        })
        .from(promptSetInvitationsTable)
        .innerJoin(
          promptSetsTable,
          eq(promptSetsTable.id, promptSetInvitationsTable.promptSetId)
        )
        .orderBy(desc(promptSetInvitationsTable.createdAt))
        .$dynamic();
      let countQuery = tx
        .select({ count: count() })
        .from(promptSetInvitationsTable)
        .innerJoin(
          promptSetsTable,
          eq(promptSetsTable.id, promptSetInvitationsTable.promptSetId)
        )
        .$dynamic();

      if (options.filters?.excludeRevokedInvitations) {
        whereConditions.push(isNull(promptSetInvitationsTable.revokedAt));
      }
      if (options.filters?.excludeUsedInvitations) {
        whereConditions.push(isNull(promptSetInvitationsTable.usedAt));
      }

      if (
        options.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        const aclJoinCondition = and(
          eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
          eq(userRoleOnPromptSetTable.userId, options.requestedByUserId),
          inArray(userRoleOnPromptSetTable.role, [
            UserRoleOnPromptSet.admin,
            UserRoleOnPromptSet.owner,
          ])
        );

        // Inner join to ensure that only the invitations that were created for
        // the Prompt Sets where the user (`requestedByUserId`) is admin or owner
        // Note: For public Prompt Sets, we don't have "invitation" concept so this
        // method won't return anything for public Prompt Sets because of the
        // inner join instead left join.
        query = query.innerJoin(userRoleOnPromptSetTable, aclJoinCondition);
        countQuery = countQuery.innerJoin(
          userRoleOnPromptSetTable,
          aclJoinCondition
        );
      }

      return await paginateQuery(
        query.where(and(...whereConditions)),
        countQuery.where(and(...whereConditions)),
        {
          page: options.page,
          pageSize: options.pageSize,
        }
      );
    }, options?.tx);
  }

  static async removeCoAuthor(
    options: DbOptions<false> & {
      promptSetId: number;
      coAuthorUserId: string;
      /**
       * Caller user ID of the method. Will be used to apply access control rules if provided.
       */
      requestedByUserId?: string;
    }
  ) {
    return withTxOrTx(async (tx) => {
      if (
        options.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        // Get roles of user and the co-author who is going to be removed
        const roles = await tx
          .select({
            userId: userRoleOnPromptSetTable.userId,
            role: userRoleOnPromptSetTable.role,
          })
          .from(userRoleOnPromptSetTable)
          .where(
            and(
              inArray(userRoleOnPromptSetTable.userId, [
                options.requestedByUserId,
                options.coAuthorUserId,
              ]),
              eq(userRoleOnPromptSetTable.promptSetId, options.promptSetId)
            )
          );

        // Extract roles into variables
        const { role: coAuthorUserRole } =
          roles.find((r) => r.userId === options.coAuthorUserId) || {};
        const { role: requestedByUserRole } =
          roles.find((r) => r.userId === options.requestedByUserId) || {};

        // Only Admins and Owners can remove other users from the Prompt Set
        if (
          requestedByUserRole !== UserRoleOnPromptSet.admin &&
          requestedByUserRole !== UserRoleOnPromptSet.owner
        ) {
          throw ApiError.forbidden();
        }

        // No one can remove Owner
        if (coAuthorUserRole === UserRoleOnPromptSet.owner) {
          throw ApiError.forbidden();
        }
      }

      await tx
        .update(userRoleOnPromptSetTable)
        .set({
          role: null,
          updatedAt: sql`NOW()`,
        })
        .where(
          and(
            eq(userRoleOnPromptSetTable.userId, options.coAuthorUserId),
            eq(userRoleOnPromptSetTable.promptSetId, options.promptSetId)
          )
        );
    }, options?.tx);
  }

  static async checkInvitationCode(
    data: {
      code: string;
    },
    options?: DbOptions
  ) {
    return withTxOrDb(async (tx) => {
      const [invitation] = await tx
        .select()
        .from(promptSetInvitationsTable)
        .where(and(eq(promptSetInvitationsTable.code, data.code)));

      if (!invitation) {
        return undefined;
      }

      if (invitation?.revokedAt !== null) {
        return undefined;
      }

      // Only check is the invitation used only if it is not reusable
      if (invitation?.isReusable === false) {
        if (invitation?.usedAt !== null) {
          return undefined;
        }
      }

      return invitation;
    }, options?.tx);
  }

  static async useInvitation(
    data: {
      code: string;
      userId: string;
    },
    options?: DbOptions
  ) {
    return withTxOrTx(async (tx) => {
      const [invitation] = await tx
        .select()
        .from(promptSetInvitationsTable)
        .where(eq(promptSetInvitationsTable.code, data.code));

      if (!invitation) {
        throw ApiError.notFound("Invitation not found");
      }

      if (invitation.revokedAt !== null) {
        throw ApiError.badRequest("Invitation revoked");
      }

      if (invitation.isReusable === false) {
        if (invitation.usedAt !== null) {
          throw ApiError.badRequest("Invitation already used");
        }

        // Mark the invitation as used if it is not reusable
        await tx
          .update(promptSetInvitationsTable)
          .set({ usedAt: sql`NOW()` })
          .where(eq(promptSetInvitationsTable.code, data.code));
      }

      // Give specified role to the user in the Prompt Set
      await tx
        .insert(userRoleOnPromptSetTable)
        .values({
          userId: data.userId,
          promptSetId: invitation.promptSetId,
          role: invitation.role,
        })
        .onConflictDoUpdate({
          target: [
            userRoleOnPromptSetTable.userId,
            userRoleOnPromptSetTable.promptSetId,
          ],
          set: {
            role: invitation.role,
            updatedAt: sql`NOW()`,
          },
        });

      // Set the inviter for the invited user
      await tx
        .update(userProfileTable)
        .set({ invitedBy: invitation.createdBy })
        .where(eq(userProfileTable.userId, data.userId));

      return true;
    }, options?.tx);
  }

  static async revokeInvitation(
    data: {
      code: string;
    },
    options?: DbOptions & {
      /**
       * Caller user ID of the method. Will be used to apply access control rules if provided.
       */
      requestedByUserId?: string;
    }
  ) {
    return withTxOrTx(async (tx) => {
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        const [invitation] = await tx
          .select({
            promptSetId: promptSetInvitationsTable.promptSetId,
          })
          .from(promptSetInvitationsTable)
          .where(eq(promptSetInvitationsTable.code, data.code));

        if (!invitation) {
          throw ApiError.notFound("Invitation code not found");
        }

        // Get the user's role for the Prompt Set
        const { role } = await tx
          .select({
            role: userRoleOnPromptSetTable.role,
          })
          .from(userRoleOnPromptSetTable)
          .where(
            and(
              eq(userRoleOnPromptSetTable.userId, options.requestedByUserId),
              eq(userRoleOnPromptSetTable.promptSetId, invitation.promptSetId)
            )
          )
          .then((result) => result[0] || { role: null });

        // Check if the user has permissions to revoke an invitation
        if (
          role !== UserRoleOnPromptSet.admin &&
          role !== UserRoleOnPromptSet.owner
        ) {
          throw ApiError.forbidden();
        }
      }

      // Revoke the invitation
      await tx
        .update(promptSetInvitationsTable)
        .set({ revokedAt: sql`NOW()` })
        .where(eq(promptSetInvitationsTable.code, data.code));
    }, options?.tx);
  }

  static async createInvitationCode(
    data: {
      promptSetId: number;
      role: UserRoleOnPromptSet;
      createdBy: string;
      isReusable?: boolean;
    },
    options?: DbOptions & {
      /**
       * Caller user ID of the method. Will be used to apply access control rules if provided.
       */
      requestedByUserId?: string;
    }
  ) {
    return withTxOrDb(async (tx) => {
      const code = randomBytes(16).toString("hex"); // Will be 32 characters long, each character is 2 hex digits

      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        // Get the user's role for the Prompt Set
        const { role } = await tx
          .select({
            role: userRoleOnPromptSetTable.role,
          })
          .from(userRoleOnPromptSetTable)
          .where(
            and(
              eq(userRoleOnPromptSetTable.userId, options.requestedByUserId),
              eq(userRoleOnPromptSetTable.promptSetId, data.promptSetId)
            )
          )
          .then((result) => result[0] || { role: null });

        // Check if the user has permissions to create an invitation
        if (
          role !== UserRoleOnPromptSet.admin &&
          role !== UserRoleOnPromptSet.owner
        ) {
          throw ApiError.forbidden();
        }
      }

      // Create the invitation
      await tx.insert(promptSetInvitationsTable).values({
        code,
        promptSetId: data.promptSetId,
        role: data.role,
        createdBy: data.createdBy,
        isReusable: data.isReusable,
      });

      return code;
    }, options?.tx);
  }

  static async getTags(
    options?: DbOptions &
      PaginationOptions & {
        filters?: {
          search?: string;
        };
      }
  ) {
    return await withTxOrDb(async (tx) => {
      const query = tx
        .select({
          tag: promptSetTagsTable.tag,
        })
        .from(promptSetTagsTable)
        .groupBy(promptSetTagsTable.tag)
        .orderBy(asc(promptSetTagsTable.tag))
        .$dynamic();
      const countQuery = tx
        .select({
          count: sql<number>`COUNT(DISTINCT ${promptSetTagsTable.tag})`.mapWith(
            Number
          ),
        })
        .from(promptSetTagsTable)
        .$dynamic();
      const whereConditions = [];

      if (options?.filters?.search) {
        whereConditions.push(
          ilike(promptSetTagsTable.tag, `%${options.filters.search}%`)
        );
      }

      const result = await paginateQuery(
        query.where(and(...whereConditions)),
        countQuery.where(and(...whereConditions)),
        {
          page: options?.page,
          pageSize: options?.pageSize,
        }
      );

      return {
        data: result.data.map((item) => item.tag),
        totalCount: result.totalCount,
      };
    }, options?.tx);
  }

  static async getCategories(
    options?: DbOptions &
      PaginationOptions & {
        filters?: {
          search?: string;
        };
      }
  ) {
    return await withTxOrDb(async (tx) => {
      const query = tx
        .select({
          category: promptSetsTable.category,
        })
        .from(promptSetsTable)
        .where(isNotNull(promptSetsTable.category))
        .groupBy(promptSetsTable.category)
        .orderBy(asc(promptSetsTable.category))
        .$dynamic();
      const countQuery = tx
        .select({
          count:
            sql<number>`COUNT(DISTINCT ${promptSetsTable.category})`.mapWith(
              Number
            ),
        })
        .from(promptSetsTable)
        .where(isNotNull(promptSetsTable.category))
        .$dynamic();
      const whereConditions = [isNotNull(promptSetsTable.category)];

      if (options?.filters?.search) {
        whereConditions.push(
          ilike(promptSetsTable.category, `%${options.filters.search}%`)
        );
      }

      const result = await paginateQuery(
        query.where(and(...whereConditions)),
        countQuery.where(and(...whereConditions)),
        {
          page: options?.page,
          pageSize: options?.pageSize,
        }
      );

      return {
        data: result.data.map((item) => item.category),
        totalCount: result.totalCount,
      };
    }, options?.tx);
  }

  /**
   * Retrieves the Prompt Sets that `requestedByUserId` is allowed
   * to include or exclude `promptId`. Unlike `getPromptSets()`, this
   * one only returns Prompt Set IDs and titles.
   */
  static async getAssignablePromptSets(
    options: DbOptions &
      PaginationOptions & {
        promptId: string;
        requestedByUserId: string;
        filters?: {
          promptSetTitle?: string;
        };
      }
  ) {
    return withTxOrTx(async (tx) => {
      const query = tx
        .select({
          id: promptSetsTable.id,
          title: promptSetsTable.title,
          promptStatus: promptSetPrompts.status,
        })
        .from(promptSetsTable)
        .leftJoin(
          promptSetPrompts,
          and(
            eq(promptSetPrompts.promptSetId, promptSetsTable.id),
            eq(promptSetPrompts.promptId, options.promptId)
          )
        )
        .leftJoin(
          userRoleOnPromptSetTable,
          and(
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
            eq(userRoleOnPromptSetTable.userId, options.requestedByUserId)
          )
        )
        .groupBy(
          promptSetsTable.id,
          promptSetsTable.title,
          promptSetPrompts.status
        )
        .$dynamic();

      const whereConditions = [
        // Prompt Set shouldn't be marked as deleted
        isNull(promptSetsTable.deletedAt),

        // One of the following conditions must be true in order for user
        // to assign that Prompt to the Prompt Set.
        sql`
          CASE
            WHEN ${promptSetPrompts.status} = ${PromptStatuses.excluded} THEN
              ${
                // TODO: This can be useful later if we implement a UI where user can decide which Prompt Sets are going to include or exclude the given chosen Prompt (like a multi select).
                // The Prompt is excluded from the Prompt Set. In that case
                // only Owner or Admins can re-include that Prompt.
                // inArray(userRoleOnPromptSetTable.role, [
                //   UserRoleOnPromptSet.admin,
                //   UserRoleOnPromptSet.owner,
                // ])
                false
              }
            WHEN ${promptSetPrompts.status} != ${PromptStatuses.included} OR ${promptSetPrompts.status} IS NULL THEN
              ${
                // In other situations (the Prompt is not included by the Prompt Set), all the
                // relevant roles can include that Prompt.
                inArray(userRoleOnPromptSetTable.role, [
                  UserRoleOnPromptSet.admin,
                  UserRoleOnPromptSet.owner,
                  UserRoleOnPromptSet.collaborator,
                ])

                // Or Prompt Set allows public submissions
              } OR (
                ${promptSetsTable.isPublic} = true AND
                ${promptSetsTable.isPublicSubmissionsAllowed} = true
              )
          END
        `,
      ];

      // Apply filters
      if (options.filters?.promptSetTitle) {
        whereConditions.push(
          ilike(promptSetsTable.title, `%${options.filters.promptSetTitle}%`)
        );
      }

      const countQuery = tx
        .select({
          count: countDistinct(promptSetsTable.id),
        })
        .from(promptSetsTable)
        .leftJoin(
          promptSetPrompts,
          eq(promptSetsTable.id, promptSetPrompts.promptSetId)
        )
        .leftJoin(promptsTable, eq(promptSetPrompts.promptId, promptsTable.id))
        .leftJoin(
          userRoleOnPromptSetTable,
          and(
            eq(promptSetsTable.id, userRoleOnPromptSetTable.promptSetId),
            eq(userRoleOnPromptSetTable.userId, options.requestedByUserId)
          )
        )
        .$dynamic();

      return await paginateQuery(
        query.where(and(...whereConditions)),
        countQuery.where(and(...whereConditions)),
        {
          page: options?.page,
          pageSize: options?.pageSize,
        }
      );
    }, options?.tx);
  }

  /**
   * Includes the Prompts that matches with the given filters to the given Prompt Set.
   * This function uses `PromptService.getPrompts()`.
   */
  static async includePrompts(
    options: DbOptions & {
      requestedByUserId: string;
      promptSetId: number;
      filters: z.infer<typeof promptFiltersSchema>;

      /**
       * If enabled then checks whether the user has permissions
       * to add new Prompts to the Prompt Set.
       */
      checkPromptSetPermissions?: boolean;
    }
  ) {
    const { checkPromptSetPermissions = true } = options;

    return await withTxOrTx(async (tx) => {
      // Apply access control rules
      if (
        checkPromptSetPermissions &&
        options.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        const [promptSet] = await tx
          .select({
            isPublic: promptSetsTable.isPublic,
            isPublicSubmissionsAllowed:
              promptSetsTable.isPublicSubmissionsAllowed,
          })
          .from(promptSetsTable)
          .where(eq(promptSetsTable.id, options.promptSetId));

        if (!promptSet) {
          throw ApiError.notFound("Prompt Set not found");
        }

        const { role } = await tx
          .select({ role: userRoleOnPromptSetTable.role })
          .from(userRoleOnPromptSetTable)
          .where(
            and(
              eq(userRoleOnPromptSetTable.userId, options.requestedByUserId),
              eq(userRoleOnPromptSetTable.promptSetId, options.promptSetId)
            )
          )
          .then((result) => result[0] || { role: null });

        // Check if user is allowed to include a new Prompt to the Prompt Set
        if (
          !promptSet.isPublic &&
          // Prompt Set is public but doesn't allow public submissions
          !promptSet.isPublicSubmissionsAllowed &&
          role !== UserRoleOnPromptSet.admin &&
          role !== UserRoleOnPromptSet.owner &&
          role !== UserRoleOnPromptSet.collaborator
        ) {
          throw ApiError.forbidden();
        }
      }

      // If the given filters match with a large number of Prompts, we need
      // to process small amount of them in each cycle to keep the memory usage low.
      const maxPromptsPerCycle = 2_000;
      let page = 1;
      let totalIncluded = 0;
      while (true) {
        const prompts = await PromptService.getPrompts({
          tx,
          filters: options.filters,
          page,
          pageSize: maxPromptsPerCycle,
          requestedByUserId: options.requestedByUserId,
        });

        await tx
          .insert(promptSetPrompts)
          .values(
            prompts.data.map((p) => ({
              promptSetId: options.promptSetId,
              promptId: p.id,
              status: PromptStatuses.included,
            }))
          )
          .onConflictDoUpdate({
            target: [promptSetPrompts.promptSetId, promptSetPrompts.promptId],
            set: {
              status: excluded(promptSetPrompts.status),
            },
          });

        // Break the loop if we have processed all of them
        totalIncluded += prompts.data.length;
        if (totalIncluded >= prompts.totalCount) {
          break;
        }

        // Go to the next page
        page++;
      }
    }, options.tx);
  }

  static async updatePromptAssignmentStatus(
    options: DbOptions & {
      requestedByUserId?: string;
      promptSetId: number;
      promptId: string;
      status: PromptStatus;
    }
  ) {
    return withTxOrTx(async (tx) => {
      // Apply access control rules
      if (
        options.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        const [promptSet] = await tx
          .select({
            isPublic: promptSetsTable.isPublic,
            isPublicSubmissionsAllowed:
              promptSetsTable.isPublicSubmissionsAllowed,
          })
          .from(promptSetsTable)
          .where(eq(promptSetsTable.id, options.promptSetId));

        if (!promptSet) {
          throw ApiError.notFound("Prompt Set not found");
        }

        const { role } = await tx
          .select({
            role: userRoleOnPromptSetTable.role,
          })
          .from(userRoleOnPromptSetTable)
          .where(
            and(
              eq(userRoleOnPromptSetTable.userId, options.requestedByUserId),
              eq(userRoleOnPromptSetTable.promptSetId, options.promptSetId)
            )
          )
          .then((result) => result[0] || { role: null });

        // Check if user is allowed to include a new Prompt to the Prompt Set
        if (
          options.status === PromptStatuses.included &&
          !promptSet.isPublic &&
          !promptSet.isPublicSubmissionsAllowed && // And Prompt Set doesn't allow public submissions
          role !== UserRoleOnPromptSet.admin &&
          role !== UserRoleOnPromptSet.owner &&
          role !== UserRoleOnPromptSet.collaborator
        ) {
          throw ApiError.forbidden();
        }

        // Check if user is allowed to exclude a Prompt from the Prompt Set.
        // Only Admins and Owners are allowed to do that, not collaborators.
        if (
          options.status === PromptStatuses.excluded &&
          role !== UserRoleOnPromptSet.admin &&
          role !== UserRoleOnPromptSet.owner
        ) {
          throw ApiError.forbidden();
        }

        // If user is trying to include a new Prompt, check if it has enough
        // permissions to see that Prompt.
        if (options.status === PromptStatuses.included) {
          const { id: promptId } = await tx
            .select({ id: promptsTable.id })
            .from(promptsTable)
            .leftJoin(
              promptSetPrompts,
              eq(promptsTable.id, promptSetPrompts.promptId)
            )
            .leftJoin(
              promptSetsTable,
              eq(promptSetPrompts.promptSetId, promptSetsTable.id)
            )
            .leftJoin(
              userRoleOnPromptSetTable,
              and(
                eq(
                  userRoleOnPromptSetTable.promptSetId,
                  promptSetPrompts.promptSetId
                ),
                eq(
                  userRoleOnPromptSetTable.userId,

                  // Check `PromptSetService.getPromptSets()` for more details about this usage
                  options.requestedByUserId || NULL_UUID
                )
              )
            )
            .where(
              and(
                // We are looking for the target Prompt
                eq(promptsTable.id, options.promptId),

                // And retrieve it only if one of the following conditions is true
                or(
                  // TODO: Is that ok?
                  // The user is owner (uploader) of the Prompt
                  // eq(filesTable.uploaderId, options.requestedByUserId),

                  // The user has one of the relevant roles to see the Prompt
                  inArray(userRoleOnPromptSetTable.role, [
                    UserRoleOnPromptSet.admin,
                    UserRoleOnPromptSet.owner,
                    UserRoleOnPromptSet.collaborator,
                    UserRoleOnPromptSet.reviewer,
                  ]),

                  // The Prompt is already can be seen by everyone
                  eq(promptSetsTable.isPublic, true)
                )
              )
            )
            .groupBy(promptsTable.id)
            .then((result) => result[0] || { id: null });

          if (!promptId) {
            throw ApiError.notFound("Prompt not found");
          }
        }
      }

      // TODO: Assign the Prompt to "Unassigned" Prompt Set if it's no longer assigned to any other Prompt Set

      await tx
        .insert(promptSetPrompts)
        .values({
          promptSetId: options.promptSetId,
          promptId: options.promptId,
          status: options.status,
        })
        .onConflictDoUpdate({
          target: [promptSetPrompts.promptSetId, promptSetPrompts.promptId],
          set: {
            status: options.status,
          },
        });
    }, options?.tx);
  }

  static async hasRoleOnPromptSet(
    options: DbOptions & {
      userId: string;
      promptSetId: number;
    }
  ) {
    return withTxOrDb(async (tx) => {
      return await tx
        .select({
          role: userRoleOnPromptSetTable.role,
        })
        .from(userRoleOnPromptSetTable)
        .where(
          and(
            eq(userRoleOnPromptSetTable.userId, options.userId),
            eq(userRoleOnPromptSetTable.promptSetId, options.promptSetId)
          )
        )
        .then((result) => Boolean(result[0]?.role));
    }, options?.tx);
  }

  /// Query builders

  /**
   * Builds a query that combines all the contributions that are made for
   * the Prompt Sets and returns the user IDs who made those contributions.
   */
  private static buildContributionsQuery(
    tx: DbTx,
    queryName = "contributions"
  ) {
    // TODO: Contribution types can be included too if needed
    // TODO: Contributors who made reviews for the Prompts

    // We have a where condition so the uploader id won't be null
    const uploaderId = sql<string>`${hashRegistrationsTable.uploaderId}`.as(
      "hash_registration_uploader_id"
    );

    // Contributors who uploaded the Prompts
    const promptContributionsQuery = tx
      .select({
        promptSetId: promptSetPrompts.promptSetId,
        userId: uploaderId,
      })
      .from(promptsTable)
      .innerJoin(
        hashRegistrationsTable,
        and(
          eq(
            hashRegistrationsTable.sha256,
            promptsTable.hashSha256Registration
          ),
          eq(hashRegistrationsTable.cid, promptsTable.hashCIDRegistration)
        )
      )
      .innerJoin(
        promptSetPrompts,
        eq(promptSetPrompts.promptId, promptsTable.id)
      )
      .where(isNotNull(hashRegistrationsTable.uploaderId))
      .groupBy(promptSetPrompts.promptSetId, hashRegistrationsTable.uploaderId);

    // Contributors who uploaded the Responses
    const responseContributionsQuery = tx
      .select({
        promptSetId: promptSetPrompts.promptSetId,
        userId: uploaderId,
      })
      .from(responsesTable)
      .innerJoin(
        hashRegistrationsTable,
        and(
          eq(
            hashRegistrationsTable.sha256,
            responsesTable.hashSha256Registration
          ),
          eq(hashRegistrationsTable.cid, responsesTable.hashCIDRegistration)
        )
      )
      .innerJoin(
        promptSetPrompts,
        eq(promptSetPrompts.promptId, responsesTable.promptId)
      )
      .where(isNotNull(hashRegistrationsTable.uploaderId))
      .groupBy(promptSetPrompts.promptSetId, hashRegistrationsTable.uploaderId);

    // Contributors who uploaded the Scores
    const scoreContributionsQuery = tx
      .select({
        promptSetId: promptSetPrompts.promptSetId,
        userId: uploaderId,
      })
      .from(scoresTable)
      .innerJoin(
        hashRegistrationsTable,
        and(
          eq(hashRegistrationsTable.sha256, scoresTable.hashSha256Registration),
          eq(hashRegistrationsTable.cid, scoresTable.hashCIDRegistration)
        )
      )
      .innerJoin(
        promptSetPrompts,
        eq(promptSetPrompts.promptId, scoresTable.promptId)
      )
      .where(isNotNull(hashRegistrationsTable.uploaderId))
      .groupBy(promptSetPrompts.promptSetId, hashRegistrationsTable.uploaderId);

    // Contributors who are invited to collaborate on the Prompt Set (reviewers, collaborators etc.)
    const promptSetCollaboratorsQuery = tx
      .select({
        promptSetId: userRoleOnPromptSetTable.promptSetId,
        userId: userRoleOnPromptSetTable.userId,
      })
      .from(userRoleOnPromptSetTable)
      .where(isNotNull(userRoleOnPromptSetTable.role));

    // Union those queries into a single one
    return unionAll(
      promptContributionsQuery,
      responseContributionsQuery,
      scoreContributionsQuery,
      promptSetCollaboratorsQuery
    ).as(queryName);
  }
}

export type GetPromptSetsReturnItem = Awaited<
  ReturnType<(typeof PromptSetService)["getPromptSets"]>
>["data"][number];

export type InsertPromptSetData = Awaited<
  ReturnType<(typeof PromptSetService)["insertPromptSet"]>
>;

export type GetCoAuthorsReturnItem = Awaited<
  ReturnType<(typeof PromptSetService)["getCoAuthors"]>
>["data"][number];

export type GetInvitationsReturnItem = Awaited<
  ReturnType<(typeof PromptSetService)["getInvitations"]>
>["data"][number];

export type GetAssignablePromptSetsReturnItem = Awaited<
  ReturnType<(typeof PromptSetService)["getAssignablePromptSets"]>
>["data"][number];
