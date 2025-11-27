import { calculateCID, calculateSHA256 } from "peerbench";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import {
  promptSetsTable,
  supportingDocumentsTable,
  supportingDocumentPromptSetsTable,
  userRoleOnPromptSetTable,
} from "@/database/schema";
import { UserRoleOnPromptSet } from "@/database/types";
import { DbOptions, PaginationOptions } from "@/types/db";
import { withTxOrDb } from "@/database/helpers";
import { ADMIN_USER_ID } from "@/lib/constants";

export class SupportingDocumentService {
  /**
   * Inserts a new supporting document
   */
  static async insertDocument(
    data: {
      name: string;
      content: string;
      uploaderId: string;
      isPublic?: boolean;
      promptSetIds?: number[];
    },
    options?: DbOptions
  ) {
    const cid = await calculateCID(data.content).then((c) => c.toString());
    const sha256 = await calculateSHA256(data.content);

    return withTxOrDb(async (tx) => {
      const document = await tx
        .insert(supportingDocumentsTable)
        .values({
          name: data.name,
          content: data.content,
          cid,
          sha256,
          uploaderId: data.uploaderId,
          isPublic: data.isPublic ?? false,
        })
        .returning()
        .then(([doc]) => doc!);

      // Link to prompt sets if provided
      if (data.promptSetIds && data.promptSetIds.length > 0) {
        await tx.insert(supportingDocumentPromptSetsTable).values(
          data.promptSetIds.map((promptSetId) => ({
            documentId: document.id,
            promptSetId,
          }))
        );
      }

      return document;
    }, options?.tx);
  }

  /**
   * Updates a supporting document
   */
  static async updateDocument(
    documentId: number,
    data: {
      name?: string;
      isPublic?: boolean;
      promptSetIds?: number[];
    },
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrDb(async (tx) => {
      // Check if user has permission to update this document
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        const document = await tx
          .select()
          .from(supportingDocumentsTable)
          .where(eq(supportingDocumentsTable.id, documentId))
          .then((docs) => docs[0]);

        if (!document) {
          throw new Error("Document not found");
        }

        if (document.uploaderId !== options.requestedByUserId) {
          throw new Error("You don't have permission to update this document");
        }
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

      const updatedDocument = await tx
        .update(supportingDocumentsTable)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(supportingDocumentsTable.id, documentId))
        .returning()
        .then((docs) => docs[0]);

      // Update prompt set associations if provided
      if (data.promptSetIds !== undefined) {
        // Remove existing associations
        await tx
          .delete(supportingDocumentPromptSetsTable)
          .where(eq(supportingDocumentPromptSetsTable.documentId, documentId));

        // Add new associations
        if (data.promptSetIds.length > 0) {
          await tx.insert(supportingDocumentPromptSetsTable).values(
            data.promptSetIds.map((promptSetId) => ({
              documentId,
              promptSetId,
            }))
          );
        }
      }

      return updatedDocument;
    }, options?.tx);
  }

  /**
   * Deletes a supporting document
   */
  static async deleteDocument(
    documentId: number,
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrDb(async (tx) => {
      // Check if user has permission to delete this document
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        const document = await tx
          .select()
          .from(supportingDocumentsTable)
          .where(eq(supportingDocumentsTable.id, documentId))
          .then((docs) => docs[0]);

        if (!document) {
          throw new Error("Document not found");
        }

        if (document.uploaderId !== options.requestedByUserId) {
          throw new Error("You don't have permission to delete this document");
        }
      }

      await tx
        .delete(supportingDocumentsTable)
        .where(eq(supportingDocumentsTable.id, documentId));
    }, options?.tx);
  }

  /**
   * Gets supporting documents with access control
   */
  static async getDocuments(
    options?: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        filters?: {
          uploaderId?: string;
          promptSetId?: number;
          isPublic?: boolean;
          search?: string;
        };
      }
  ) {
    return withTxOrDb(async (tx) => {
      let query = tx
        .select({
          id: supportingDocumentsTable.id,
          name: supportingDocumentsTable.name,
          content: supportingDocumentsTable.content,
          cid: supportingDocumentsTable.cid,
          sha256: supportingDocumentsTable.sha256,
          uploaderId: supportingDocumentsTable.uploaderId,
          isPublic: supportingDocumentsTable.isPublic,
          createdAt: supportingDocumentsTable.createdAt,
          updatedAt: supportingDocumentsTable.updatedAt,
        })
        .from(supportingDocumentsTable)
        .$dynamic();

      const whereConditions: any[] = [];

      // Apply access control
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        // Join with user roles to check access
        query = query.leftJoin(
          supportingDocumentPromptSetsTable,
          eq(
            supportingDocumentPromptSetsTable.documentId,
            supportingDocumentsTable.id
          )
        );

        query = query.leftJoin(
          userRoleOnPromptSetTable,
          and(
            eq(
              userRoleOnPromptSetTable.promptSetId,
              supportingDocumentPromptSetsTable.promptSetId
            ),
            eq(userRoleOnPromptSetTable.userId, options.requestedByUserId)
          )
        );

        whereConditions.push(
          or(
            // User is the uploader
            eq(supportingDocumentsTable.uploaderId, options.requestedByUserId),
            // Document is public
            eq(supportingDocumentsTable.isPublic, true),
            // User has access through prompt set roles
            inArray(userRoleOnPromptSetTable.role, [
              UserRoleOnPromptSet.owner,
              UserRoleOnPromptSet.admin,
              UserRoleOnPromptSet.collaborator,
              UserRoleOnPromptSet.reviewer,
            ])
          )
        );
      }

      // Apply filters
      if (options?.filters?.uploaderId) {
        whereConditions.push(
          eq(supportingDocumentsTable.uploaderId, options.filters.uploaderId)
        );
      }

      if (options?.filters?.isPublic !== undefined) {
        whereConditions.push(
          eq(supportingDocumentsTable.isPublic, options.filters.isPublic)
        );
      }

      if (options?.filters?.search) {
        whereConditions.push(
          sql`${supportingDocumentsTable.name} ILIKE ${`%${options.filters.search}%`}`
        );
      }

      if (options?.filters?.promptSetId) {
        query = query.innerJoin(
          supportingDocumentPromptSetsTable,
          eq(
            supportingDocumentPromptSetsTable.documentId,
            supportingDocumentsTable.id
          )
        );
        whereConditions.push(
          eq(
            supportingDocumentPromptSetsTable.promptSetId,
            options.filters.promptSetId
          )
        );
      }

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      // Apply pagination
      if (options?.pageSize) {
        query = query.limit(options.pageSize);
      }
      if (options?.page) {
        query = query.offset(options.page);
      }

      // Order by creation date (newest first)
      query = query.orderBy(supportingDocumentsTable.createdAt);

      return await query;
    }, options?.tx);
  }

  /**
   * Gets a single document by ID with access control
   */
  static async getDocument(
    documentId: number,
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrDb(async (tx) => {
      let query = tx
        .select({
          id: supportingDocumentsTable.id,
          name: supportingDocumentsTable.name,
          content: supportingDocumentsTable.content,
          cid: supportingDocumentsTable.cid,
          sha256: supportingDocumentsTable.sha256,
          uploaderId: supportingDocumentsTable.uploaderId,
          isPublic: supportingDocumentsTable.isPublic,
          createdAt: supportingDocumentsTable.createdAt,
          updatedAt: supportingDocumentsTable.updatedAt,
        })
        .from(supportingDocumentsTable)
        .where(eq(supportingDocumentsTable.id, documentId))
        .$dynamic();

      // Apply access control
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        query = query.leftJoin(
          supportingDocumentPromptSetsTable,
          eq(
            supportingDocumentPromptSetsTable.documentId,
            supportingDocumentsTable.id
          )
        );

        query = query.leftJoin(
          userRoleOnPromptSetTable,
          and(
            eq(
              userRoleOnPromptSetTable.promptSetId,
              supportingDocumentPromptSetsTable.promptSetId
            ),
            eq(userRoleOnPromptSetTable.userId, options.requestedByUserId)
          )
        );

        query = query.where(
          and(
            eq(supportingDocumentsTable.id, documentId),
            or(
              // User is the uploader
              eq(
                supportingDocumentsTable.uploaderId,
                options.requestedByUserId
              ),
              // Document is public
              eq(supportingDocumentsTable.isPublic, true),
              // User has access through prompt set roles
              inArray(userRoleOnPromptSetTable.role, [
                UserRoleOnPromptSet.owner,
                UserRoleOnPromptSet.admin,
                UserRoleOnPromptSet.collaborator,
                UserRoleOnPromptSet.reviewer,
              ])
            )
          )
        );
      }

      const documents = await query;
      return documents[0] || null;
    }, options?.tx);
  }

  /**
   * Gets prompt sets associated with a document
   */
  static async getDocumentPromptSets(
    documentId: number,
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrDb(async (tx) => {
      let query = tx
        .select({
          id: promptSetsTable.id,
          title: promptSetsTable.title,
          description: promptSetsTable.description,
          isPublic: promptSetsTable.isPublic,
        })
        .from(supportingDocumentPromptSetsTable)
        .innerJoin(
          promptSetsTable,
          eq(promptSetsTable.id, supportingDocumentPromptSetsTable.promptSetId)
        )
        .where(eq(supportingDocumentPromptSetsTable.documentId, documentId))
        .$dynamic();

      // Apply access control
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        query = query.leftJoin(
          userRoleOnPromptSetTable,
          and(
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
            eq(userRoleOnPromptSetTable.userId, options.requestedByUserId)
          )
        );

        query = query.where(
          and(
            eq(supportingDocumentPromptSetsTable.documentId, documentId),
            or(
              // Prompt set is public
              eq(promptSetsTable.isPublic, true),
              // User has access through roles
              inArray(userRoleOnPromptSetTable.role, [
                UserRoleOnPromptSet.owner,
                UserRoleOnPromptSet.admin,
                UserRoleOnPromptSet.collaborator,
                UserRoleOnPromptSet.reviewer,
              ])
            )
          )
        );
      }

      return await query;
    }, options?.tx);
  }
}
