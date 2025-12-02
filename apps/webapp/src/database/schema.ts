import { ReviewOpinion } from "@/types/review";
import { PromptOptions, PromptType, ScoringMethod } from "peerbench";
import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  json,
  boolean,
  real,
  varchar,
  bigint,
  jsonb,
  primaryKey,
  unique,
  pgView,
  index,
  foreignKey,
  numeric,
  PgSelectQueryBuilder,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import {
  EvaluationSource,
  FileType,
  QuickFeedbackOpinion,
  PromptSetLicense,
  PromptSetLicenses,
  PromptStatus,
  SignatureKeyType,
  SignatureType,
  UserRoleOnPromptSet,
  ApiKeyProvider,
  PromptStatuses,
  NotificationType,
  UserNotificationSubscriptionReason,
  UserNotificationSubscriptionReasons,
} from "./types";
import {
  aliasedTable,
  and,
  count,
  countDistinct,
  eq,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
  StringChunk,
} from "drizzle-orm";
import { avg, jsonbAgg, jsonbBuildObject, sum } from "./helpers";
import { InferData } from "./utilities";

/**************************************************
 * Tables                                         *
 **************************************************/

export const promptSetsTable = pgTable("prompt_sets", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  title: text().notNull().unique(),
  description: text().notNull().default(""),
  citationInfo: text().notNull().default(""),
  category: varchar({ length: 100 }).notNull().default("Default"),
  license: varchar({ length: 100 })
    .$type<PromptSetLicense>()
    .notNull()
    .default(PromptSetLicenses.ccBy40),
  ownerId: uuid("owner_id")
    .references(() => authUsers.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  isPublicSubmissionsAllowed: boolean("is_public_submissions_allowed")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: jsonb().$type<Record<string, any>>().default({}),
  deletedAt: timestamp("deleted_at"),
});
export type DbPromptSet = typeof promptSetsTable.$inferSelect;

export const promptSetTagsTable = pgTable("prompt_set_tags", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  promptSetId: integer("prompt_set_id")
    .references(() => promptSetsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  tag: varchar({ length: 100 }).notNull(),
});

export const promptsTable = pgTable("prompts", {
  id: uuid().primaryKey(),

  /**
   * @deprecated Removed in the future
   */
  fileId: integer("file_id").references(() => filesTable.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),

  type: varchar({ length: 30 }).$type<PromptType>().notNull(),

  question: text(),
  cid: text().notNull(),
  sha256: text().notNull(),

  fullPrompt: text("full_prompt"),
  fullPromptCID: text("full_prompt_cid").notNull(),
  fullPromptSHA256: text("full_prompt_sha256").notNull(),

  options: json().$type<PromptOptions>(),
  answerKey: text("answer_key"),
  answer: text(),

  metadata: jsonb().$type<any>(),

  scorers: jsonb().$type<string[]>(),

  hashSha256Registration: text("hash_sha256_registration").notNull(),
  hashCIDRegistration: text("hash_cid_registration").notNull(),
  uploaderId: uuid("uploader_id").notNull(),

  isRevealed: boolean("is_revealed").notNull().default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promptSetPrompts = pgTable(
  "prompt_set_prompts",
  {
    promptSetId: integer("prompt_set_id")
      .references(() => promptSetsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    promptId: uuid("prompt_id")
      .references(() => promptsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    status: varchar({ length: 30 }).$type<PromptStatus>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.promptSetId, table.promptId] })]
);
export type DbPromptSetPrompt = typeof promptSetPrompts.$inferSelect;
export type DbPromptSetPromptInsert = typeof promptSetPrompts.$inferInsert;

export type DbPrompt = typeof promptsTable.$inferSelect;
export type DbPromptInsert = typeof promptsTable.$inferInsert;

/**
 * @deprecated Removed in the future
 */
export const filesTable = pgTable("files", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  cid: text().notNull().unique(),
  sha256: text().notNull(),
  content: text().notNull(),
  type: varchar({ length: 20 }).$type<FileType>().notNull(),

  name: text(),
  uploaderId: uuid("uploader_id").references(() => authUsers.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  format: text(),
  signature: text(),
  signedBy: uuid("signed_by").references(() => authUsers.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type DbFile = typeof filesTable.$inferSelect;
export type DbFileInsert = typeof filesTable.$inferInsert;

export const hashRegistrationsTable = pgTable(
  "hash_registrations",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    cid: text("cid").notNull(),
    sha256: text("sha256").notNull(),

    signature: text(), // default to signing CID
    signatureType: varchar("signature_type", { length: 10 })
      .$type<SignatureType>()
      .default("cid"),
    publicKey: text("public_key"),
    keyType: varchar("key_type", { length: 50 })
      .$type<SignatureKeyType>()
      .default("secp256k1n"),
    uploaderId: uuid("uploader_id"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    //TODO later maybe we include links to the parsed rows in the prompts, response, score...  tables . So we have a back link if we want to see the original data. - Rb
  },
  (table) => [unique().on(table.cid, table.sha256)]
);
export type DbHashRegistration = typeof hashRegistrationsTable.$inferSelect;
export type DbHashRegistrationInsert =
  typeof hashRegistrationsTable.$inferInsert;

export const rawDataRegistrationsTable = pgTable(
  "raw_data_registrations",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    cid: text("cid").notNull(), //join hash table
    sha256: text("sha256").notNull(), //join hash table
    rawData: text("raw_data").notNull(),
    publicKey: text("public_key"),
    uploaderId: uuid("uploader_id"), // this will be used to identify the uploader of the raw data
    public: boolean("public").notNull().default(false), //If someone is uploading data to a draft/private prompt_set then this needs to be default false...
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.cid, table.sha256)]
);
export type DbRawDataRegistration =
  typeof rawDataRegistrationsTable.$inferSelect;
export type DbRawDataRegistrationInsert =
  typeof rawDataRegistrationsTable.$inferInsert;

export const providerModelsTable = pgTable(
  "provider_models",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    provider: varchar("provider", { length: 100 }).notNull(),

    /**
     * @deprecated `modelId` should be sufficient
     */
    name: varchar("name", { length: 100 }).notNull(),

    /**
     * @deprecated `modelId` should be sufficient
     */
    host: text("host").notNull(),

    /**
     * @deprecated `modelId` should be sufficient
     */
    owner: text("owner").notNull(),
    modelId: text("model_id").notNull(),
    perMillionTokenInputCost: numeric("per_million_token_input_cost", {
      precision: 14,
      scale: 10,
    }),
    perMillionTokenOutputCost: numeric("per_million_token_output_cost", {
      precision: 14,
      scale: 10,
    }),
    knownModelId: integer("known_model_id").references(
      () => knownModelsTable.id,
      {
        onDelete: "set null",
        onUpdate: "cascade",
      }
    ),

    /**
     * @deprecated Removed in the future. Use the `elo` from `known_models` table instead
     */
    elo: real("elo").default(1000),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique("unique_model").on(table.modelId)]
);
export type DbProviderModel = typeof providerModelsTable.$inferSelect;
export type DbProviderModelInsert = typeof providerModelsTable.$inferInsert;

export const knownModelsTable = pgTable(
  "known_models",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    name: text("name").notNull(),
    owner: text("owner").notNull(),
    elo: real("elo").default(1000),
    metadata: jsonb().$type<any>().default({}),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.name, table.owner)]
);
export type DbKnownModel = typeof knownModelsTable.$inferSelect;
export type DbKnownModelInsert = typeof knownModelsTable.$inferInsert;

export const modelMatchesTable = pgTable("model_matches", {
  id: uuid().primaryKey().defaultRandom(),
  modelAId: integer("model_a_id")
    .references(() => providerModelsTable.id)
    .notNull(),
  modelBId: integer("model_b_id")
    .references(() => providerModelsTable.id)
    .notNull(),
  winnerId: integer("winner_id").references(() => providerModelsTable.id), // if null then it's a draw
  promptId: uuid("prompt_id")
    .references(() => promptsTable.id)
    .notNull(),
  modelAResponseId: uuid("model_a_response_id").references(
    () => responsesTable.id
  ),
  modelBResponseId: uuid("model_b_response_id").references(
    () => responsesTable.id
  ),
  isShareable: boolean("is_shareable").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type DbModelMatch = typeof modelMatchesTable.$inferSelect;
export type DbModelMatchInsert = typeof modelMatchesTable.$inferInsert;

export const scoresTable = pgTable(
  "scores",
  {
    id: uuid().primaryKey(),
    score: real("score").notNull(),

    promptHashSha256Registration: text(
      "prompt_hash_sha256_registration"
    ).notNull(),
    promptHashCIDRegistration: text("prompt_hash_cid_registration").notNull(),

    responseHashSha256Registration: text(
      "response_hash_sha256_registration"
    ).notNull(),
    responseHashCIDRegistration: text(
      "response_hash_cid_registration"
    ).notNull(),

    hashSha256Registration: text("hash_sha256_registration").notNull(),
    hashCIDRegistration: text("hash_cid_registration").notNull(),
    uploaderId: uuid("uploader_id").notNull(),

    // Columns for faster lookups without joining hash registrations
    promptId: uuid("prompt_id").notNull(),
    responseId: uuid("response_id").notNull(),

    explanation: text("explanation"),

    scoringMethod: varchar("scoring_method", { length: 20 })
      .$type<ScoringMethod>()
      .notNull(),

    // Information about who produced this score. By a human or...
    scorerUserId: uuid("scorer_user_id"),

    // ...an AI model (reference to models table)
    scorerModelId: integer("scorer_model_id").references(
      () => providerModelsTable.id,
      {
        onDelete: "set null",
        onUpdate: "cascade",
      }
    ),
    // Only presented if the scoring method is `ai`
    inputTokensUsed: integer("input_tokens_used"),
    outputTokensUsed: integer("output_tokens_used"),
    inputCost: numeric("input_cost", { precision: 14, scale: 10 }), // 9999.9999999999
    outputCost: numeric("output_cost", { precision: 14, scale: 10 }), // 9999.9999999999

    metadata: jsonb().$type<any>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index().on(table.promptId), index().on(table.responseId)]
);
export type DbScore = typeof scoresTable.$inferSelect;
export type DbScoreInsert = typeof scoresTable.$inferInsert;

export const responsesTable = pgTable(
  "responses",
  {
    id: uuid().primaryKey(),
    runId: text("run_id").notNull(),

    modelId: integer("model_id")
      .references(() => providerModelsTable.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      })
      .notNull(),

    data: text("data"),
    cid: text("cid").notNull(),
    sha256: text("sha256").notNull(),

    inputTokensUsed: integer("input_tokens_used"),
    outputTokensUsed: integer("output_tokens_used"),
    inputCost: numeric("input_cost", { precision: 14, scale: 10 }), // 9999.9999999999
    outputCost: numeric("output_cost", { precision: 14, scale: 10 }), // 9999.9999999999

    hashSha256Registration: text("hash_sha256_registration").notNull(),
    hashCIDRegistration: text("hash_cid_registration").notNull(),
    uploaderId: uuid("uploader_id").notNull(),

    promptId: uuid("prompt_id")
      .references(() => promptsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),

    metadata: jsonb().$type<any>(),

    startedAt: timestamp("started_at").notNull(),
    finishedAt: timestamp("finished_at").notNull(),

    isRevealed: boolean("is_revealed").notNull().default(true),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index().on(table.promptId),
    index().on(table.modelId),
    index().on(table.runId),
  ]
);
export type DbResponse = typeof responsesTable.$inferSelect;
export type DbResponseInsert = typeof responsesTable.$inferInsert;

export const promptCommentsTable = pgTable(
  "prompt_comments",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "set null",
        onUpdate: "cascade",
      })
      .notNull(),
    content: text().notNull(),
    promptId: uuid("prompt_id").references(() => promptsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    parentCommentId: integer("parent_comment_id"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id],
    }),
  ]
);

export const responseCommentsTable = pgTable(
  "response_comments",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "set null",
        onUpdate: "cascade",
      })
      .notNull(),
    content: text().notNull(),
    responseId: uuid("response_id").references(() => responsesTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    parentCommentId: integer("parent_comment_id"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id],
    }),
  ]
);
export const scoreCommentsTable = pgTable(
  "score_comments",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "set null",
        onUpdate: "cascade",
      })
      .notNull(),
    content: text().notNull(),
    scoreId: uuid("score_id").references(() => scoresTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    parentCommentId: integer("parent_comment_id"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id],
    }),
  ]
);

export const quickFeedbacksTable = pgTable(
  "quick_feedbacks",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),

    responseId: uuid("response_id").references(() => responsesTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    promptId: uuid("prompt_id").references(() => promptsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    scoreId: uuid("score_id").references(() => scoresTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),

    opinion: varchar({ length: 10 }).$type<QuickFeedbackOpinion>().notNull(),

    // TODO: Maybe also? ....
    // promptSetId: integer("prompt_set_id").references(() => promptSetsTable.id, {
    //   onDelete: "cascade",
    //   onUpdate: "cascade",
    // }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    // TODO: We can force uniqueness per user and entity (prompt, score, response) on the database level.
  },
  (table) => [
    unique().on(table.userId, table.responseId),
    unique().on(table.userId, table.scoreId),
    unique().on(table.userId, table.promptId),
  ]
);
export type DbQuickFeedback = typeof quickFeedbacksTable.$inferSelect;
export type DbQuickFeedbackInsert = typeof quickFeedbacksTable.$inferInsert;

export const quickFeedbacks_quickFeedbackFlagsTable = pgTable(
  "quick_feedbacks_quick_feedback_flags",
  {
    quickFeedbackId: integer("quick_feedback_id")
      .references(() => quickFeedbacksTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    flagId: integer("flag_id")
      .references(() => quickFeedbackFlagsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.quickFeedbackId, table.flagId] })]
);

export const testResultsTable = pgTable(
  "test_results",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    score: real("score"),
    evaluationId: bigint("evaluation_id", { mode: "number" })
      .references(() => evaluationsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    metadata: jsonb().$type<any>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    // The following columns are filled out if
    // the test result is from ForestAI
    result: jsonb("result").$type<any>(),
    testName: text("test_name"),
    raw: text("raw"),

    // The following columns are filled out if
    // the test result is from peerBench or an LLM Protocol
    modelId: integer("model_id").references(() => providerModelsTable.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
    taskId: text("task_id"),
    response: text("response"),
    cid: text("cid"),
    sha256: text("sha256"),
    promptId: uuid("prompt_id").references(() => promptsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  },
  (table) => [index().on(table.promptId)]
);
export type DbTestResultInsert = typeof testResultsTable.$inferInsert;

export const evaluationsTable = pgTable("evaluations", {
  id: bigint({ mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity()
    .notNull(),
  source: varchar("source", { length: 20 }).$type<EvaluationSource>().notNull(),
  runId: text("run_id").notNull(),
  score: real(),
  metadata: jsonb().notNull().default({}),
  fileId: integer("file_id")
    .references(() => filesTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),

  // The following columns are filled out if
  // the evaluation is from ForestAI
  agreementId: integer("agreement_id"),
  offerId: integer("offer_id"),
  validatorId: integer("validator_id"),
  providerId: integer("provider_id"),
  commitHash: varchar("commit_hash", { length: 100 }),
  sessionId: varchar("session_id", { length: 15 }),
  protocolName: text("protocol_name"),
  protocolAddress: text("protocol_address"),

  // The following columns are filled out if
  // the evaluation is from peerBench or an LLM Protocol
  promptSetId: integer("prompt_set_id").references(() => promptSetsTable.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),

  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type DbEvaluation = typeof evaluationsTable.$inferSelect;
export type DbEvaluationInsert = typeof evaluationsTable.$inferInsert;

// TODO: Rename table name to `quick_feedback_flags`. Because some `drizzle-kit` errors, I couldn't rename it. More info: https://github.com/drizzle-team/drizzle-orm/issues/4838 - mdk
export const quickFeedbackFlagsTable = pgTable("review_flags", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  flag: varchar({ length: 50 }).unique().notNull(),
  opinion: varchar({ length: 8 }).$type<QuickFeedbackOpinion>(),
});
export type DbQuickFeedbackFlag = typeof quickFeedbackFlagsTable.$inferSelect;
export type DbQuickFeedbackFlagInsert =
  typeof quickFeedbackFlagsTable.$inferInsert;

export const testResultReviewsReviewFlagsTable = pgTable(
  "test_result_reviews_review_flags",
  {
    testResultReviewId: integer("test_result_review_id")
      .references(() => testResultReviewsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    flagId: integer("flag_id")
      .references(() => quickFeedbackFlagsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.testResultReviewId, table.flagId] })]
);

/**
 * @deprecated Use `quickFeedbacks_quickFeedbackFlagsTable` instead.
 */
export const promptReviewsReviewFlagsTable = pgTable(
  "prompt_reviews_review_flags",
  {
    promptReviewId: integer("prompt_review_id")
      .references(() => promptReviewsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    flagId: integer("flag_id")
      .references(() => quickFeedbackFlagsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.promptReviewId, table.flagId] })]
);

/**
 * @deprecated Use `commentsTable` and `quickFeedbacksTable` instead.
 */
export const promptReviewsTable = pgTable(
  "prompt_reviews",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    opinion: varchar({ length: 8 }).$type<ReviewOpinion>().notNull(),
    comment: text().notNull(),
    promptId: uuid("prompt_id")
      .references(() => promptsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    // score: ???
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("id_user_id_prompt_id_unique")
      .on(table.userId, table.promptId)
      .nullsNotDistinct(),
  ]
);
export type DbPromptReview = typeof promptReviewsTable.$inferSelect;
export type DbPromptReviewInsert = typeof promptReviewsTable.$inferInsert;

/**
 * @deprecated Removed in the future
 */
export const testResultReviewsTable = pgTable(
  "test_result_reviews",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    opinion: varchar({ length: 8 }).$type<ReviewOpinion>().notNull(),
    // score: ???
    comment: text().notNull(),
    testResultId: integer("test_result_id")
      .references(() => testResultsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    property: text(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("id_user_id_test_result_id_property_unique")
      .on(table.userId, table.testResultId, table.property)
      .nullsNotDistinct(),
  ]
);
export type DbTestResultReview = typeof testResultReviewsTable.$inferSelect;
export type DbTestResultReviewInsert =
  typeof testResultReviewsTable.$inferInsert;

export const forestaiProvidersTable = pgTable("forestai_providers", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type DbForestAIProvider = typeof forestaiProvidersTable.$inferSelect;
export type DbForestAIProviderInsert =
  typeof forestaiProvidersTable.$inferInsert;

// Organization tables
export const orgsTable = pgTable("orgs", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: text().notNull(),
  webPage: text("web_page"),
  alphaTwoCode: text("alpha_two_code"),
  country: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type DbOrg = typeof orgsTable.$inferSelect;
export type DbOrgInsert = typeof orgsTable.$inferInsert;

export const orgToPeopleTable = pgTable(
  "org_to_people",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    orgId: integer("org_id")
      .references(() => orgsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique("org_id_user_id_unique").on(table.orgId, table.userId)]
);
export type DbOrgToPeople = typeof orgToPeopleTable.$inferSelect;
export type DbOrgToPeopleInsert = typeof orgToPeopleTable.$inferInsert;

export const orgDomainsTable = pgTable("org_domains", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("org_id")
    .references(() => orgsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  domain: text().notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type DbOrgDomain = typeof orgDomainsTable.$inferSelect;
export type DbOrgDomainInsert = typeof orgDomainsTable.$inferInsert;

// Key management table
export const keyToUserTable = pgTable(
  "key_to_user",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    publicKey: text("public_key").notNull(),
    keyType: varchar("key_type", { length: 50 })
      .notNull()
      .default("secp256k1n"),
    userUuid: uuid("user_uuid")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    keySigningUuid: uuid("key_signing_uuid").notNull(),
    metadata: jsonb("metadata").$type<any>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("public_key_unique").on(table.publicKey),
    // Allow multiple keys per user per type, but ensure each public key is unique
    unique("user_uuid_public_key_unique").on(table.userUuid, table.publicKey),
  ]
);
export type DbKeyToUser = typeof keyToUserTable.$inferSelect;
export type DbKeyToUserInsert = typeof keyToUserTable.$inferInsert;

// User profile table
export const userProfileTable = pgTable(
  "user_profile",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),

    // User editable fields
    displayName: text("display_name"),
    github: text("github"),
    website: text("website"),
    bluesky: text("bluesky"),
    mastodon: text("mastodon"),
    twitter: text("twitter"),

    // System fields (not editable by user)
    invitedBy: uuid("invited_by").references(() => authUsers.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    metadata: jsonb("metadata").$type<any>().default({}),
    referralCode: varchar("referral_code", { length: 32 })
      .unique()
      .default(sql<string>`encode(extensions.gen_random_bytes(16), 'hex')`),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique("user_id_unique").on(table.userId)]
);

export type DbUserProfile = typeof userProfileTable.$inferSelect;
export type DbUserProfileInsert = typeof userProfileTable.$inferInsert;

/**
 * Sad vercel workaround of file size limits need to refactor
 * @deprecated.
 */
export const fileChunksTable = pgTable("file_chunks", {
  chunkId: integer("chunk_id").primaryKey().generatedByDefaultAsIdentity(),
  mergeId: integer("merge_id").generatedByDefaultAsIdentity().notNull(),

  content: text().notNull(),

  uploaderId: uuid("uploader_id")
    .references(() => authUsers.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRoleOnPromptSetTable = pgTable(
  "user_role_on_prompt_set",
  {
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    promptSetId: integer("prompt_set_id")
      .references(() => promptSetsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    role: varchar({ length: 20 }).$type<UserRoleOnPromptSet>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.promptSetId] })]
);
export type DbUserRoleOnPromptSet =
  typeof userRoleOnPromptSetTable.$inferSelect;
export type DbUserRoleOnPromptSetInsert =
  typeof userRoleOnPromptSetTable.$inferInsert;

export const promptSetInvitationsTable = pgTable("prompt_set_invitations", {
  code: varchar({ length: 32 }).notNull().primaryKey(),
  promptSetId: integer("prompt_set_id")
    .references(() => promptSetsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  role: varchar({ length: 20 }).$type<UserRoleOnPromptSet>().notNull(),
  createdBy: uuid("created_by")
    .references(() => authUsers.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  usedAt: timestamp("used_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isReusable: boolean("is_reusable").notNull().default(false),
});

export const supportingDocumentsTable = pgTable("supporting_documents", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: text().notNull(),
  content: text().notNull(),
  cid: text().notNull().unique(),
  sha256: text().notNull(),

  uploaderId: uuid("uploader_id")
    .references(() => authUsers.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),

  isPublic: boolean("is_public").notNull().default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type DbSupportingDocument = typeof supportingDocumentsTable.$inferSelect;
export type DbSupportingDocumentInsert =
  typeof supportingDocumentsTable.$inferInsert;

export const supportingDocumentPromptSetsTable = pgTable(
  "supporting_document_prompt_sets",
  {
    documentId: integer("document_id")
      .references(() => supportingDocumentsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    promptSetId: integer("prompt_set_id")
      .references(() => promptSetsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.documentId, table.promptSetId] })]
);
export type DbSupportingDocumentPromptSet =
  typeof supportingDocumentPromptSetsTable.$inferSelect;
export type DbSupportingDocumentPromptSetInsert =
  typeof supportingDocumentPromptSetsTable.$inferInsert;

export const apiKeysTable = pgTable("api_keys", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  key: text().notNull(),
  assignedUserId: uuid("assigned_user_id")
    .references(() => authUsers.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  provider: varchar({ length: 50 }).notNull().$type<ApiKeyProvider>(),
  metadata: jsonb("metadata").$type<any>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type DbAPIKey = typeof apiKeysTable.$inferSelect;
export type DbAPIKeyInsert = typeof apiKeysTable.$inferInsert;

/**************************************************
 * Ranking System Tables                          *
 **************************************************/

export const rankingComputationsTable = pgTable("ranking_computations", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  parameters: jsonb().notNull(),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
});
export type DbRankingComputation = typeof rankingComputationsTable.$inferSelect;
export type DbRankingComputationInsert =
  typeof rankingComputationsTable.$inferInsert;

export const rankingReviewerTrustTable = pgTable(
  "ranking_reviewer_trust",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    computationId: integer("computation_id")
      .references(() => rankingComputationsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    trustScore: real("trust_score").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.computationId, table.userId)]
);
export type DbRankingReviewerTrust =
  typeof rankingReviewerTrustTable.$inferSelect;
export type DbRankingReviewerTrustInsert =
  typeof rankingReviewerTrustTable.$inferInsert;

export const rankingPromptQualityTable = pgTable(
  "ranking_prompt_quality",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    computationId: integer("computation_id")
      .references(() => rankingComputationsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    promptId: uuid("prompt_id")
      .references(() => promptsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    qualityScore: real("quality_score").notNull(),
    reviewCount: integer("review_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.computationId, table.promptId)]
);
export type DbRankingPromptQuality =
  typeof rankingPromptQualityTable.$inferSelect;
export type DbRankingPromptQualityInsert =
  typeof rankingPromptQualityTable.$inferInsert;

export const rankingBenchmarkQualityTable = pgTable(
  "ranking_benchmark_quality",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    computationId: integer("computation_id")
      .references(() => rankingComputationsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    promptSetId: integer("prompt_set_id")
      .references(() => promptSetsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    qualityScore: real("quality_score").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.computationId, table.promptSetId)]
);
export type DbRankingBenchmarkQuality =
  typeof rankingBenchmarkQualityTable.$inferSelect;
export type DbRankingBenchmarkQualityInsert =
  typeof rankingBenchmarkQualityTable.$inferInsert;

export const rankingModelPerformanceTable = pgTable(
  "ranking_model_performance",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    computationId: integer("computation_id")
      .references(() => rankingComputationsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    model: text().notNull(),
    score: real().notNull(),
    promptsTestedCount: integer("prompts_tested_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.computationId, table.model)]
);
export type DbRankingModelPerformance =
  typeof rankingModelPerformanceTable.$inferSelect;
export type DbRankingModelPerformanceInsert =
  typeof rankingModelPerformanceTable.$inferInsert;

export const rankingModelEloTable = pgTable(
  "ranking_model_elo",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    computationId: integer("computation_id")
      .references(() => rankingComputationsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    model: text().notNull(),
    eloScore: real("elo_score").notNull().default(1500),
    winCount: integer("win_count").notNull().default(0),
    lossCount: integer("loss_count").notNull().default(0),
    matchCount: integer("match_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.computationId, table.model)]
);
export type DbRankingModelElo = typeof rankingModelEloTable.$inferSelect;
export type DbRankingModelEloInsert = typeof rankingModelEloTable.$inferInsert;

export const rankingContributorScoreTable = pgTable(
  "ranking_contributor_score",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    computationId: integer("computation_id")
      .references(() => rankingComputationsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    score: real().notNull(),
    promptCount: integer("prompt_count").notNull().default(0),
    alignedReviewCount: integer("aligned_review_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.computationId, table.userId)]
);
export type DbRankingContributorScore =
  typeof rankingContributorScoreTable.$inferSelect;
export type DbRankingContributorScoreInsert =
  typeof rankingContributorScoreTable.$inferInsert;

/**************************************************
 * System Prompts Registry Tables                 *
 **************************************************/

export const systemPromptsTable = pgTable("system_prompts", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: text().notNull().unique(),
  tags: jsonb().$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type DbSystemPrompt = typeof systemPromptsTable.$inferSelect;
export type DbSystemPromptInsert = typeof systemPromptsTable.$inferInsert;

export const systemPromptVersionsTable = pgTable(
  "system_prompt_versions",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    promptId: integer("prompt_id")
      .references(() => systemPromptsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    version: integer().notNull(),
    type: varchar({ length: 10 }).$type<"text" | "chat">().notNull(),

    // For 'text' type: string, For 'chat' type: array of {role, content}
    prompt: jsonb()
      .notNull()
      .$type<string | Array<{ role: string; content: string }>>(),

    // Optional model configuration (temperature, model name, etc.)
    config: jsonb().$type<Record<string, any>>(),

    // SHA256 hash for content-addressable retrieval
    sha256Hash: text("sha256_hash").notNull().unique(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Ensure version numbers are unique per prompt
    unique("unique_prompt_version").on(table.promptId, table.version),
    // Index on sha256_hash for fast hash-based lookups
    index("idx_system_prompt_versions_sha256").on(table.sha256Hash),
  ]
);
export type DbSystemPromptVersion =
  typeof systemPromptVersionsTable.$inferSelect;
export type DbSystemPromptVersionInsert =
  typeof systemPromptVersionsTable.$inferInsert;

export const systemPromptLabelsTable = pgTable(
  "system_prompt_labels",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    promptId: integer("prompt_id")
      .references(() => systemPromptsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    version: integer().notNull(),

    // Supported labels: 'latest', 'production', 'development', 'local'
    label: varchar({ length: 20 }).notNull(),

    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (table) => [
    // Only one version can have a specific label per prompt
    unique("unique_prompt_label").on(table.promptId, table.label),

    // Foreign key to ensure version exists
    foreignKey({
      columns: [table.promptId, table.version],
      foreignColumns: [
        systemPromptVersionsTable.promptId,
        systemPromptVersionsTable.version,
      ],
    }),
  ]
);
export type DbSystemPromptLabel = typeof systemPromptLabelsTable.$inferSelect;
export type DbSystemPromptLabelInsert =
  typeof systemPromptLabelsTable.$inferInsert;

export const notificationsTable = pgTable("notifications", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  userId: uuid("user_id")
    .references(() => authUsers.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  content: text().notNull(),
  metadata: jsonb("metadata")
    .$type<Record<string, any>>()
    .default({})
    .notNull(),
  type: varchar({ length: 20 }).$type<NotificationType>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
});

/**************************************************
 * Views                                          *
 **************************************************/
export const leaderboardView = pgView("v_leaderboard").as((qb) => {
  const model = sql<string>`
    CASE
      WHEN ${providerModelsTable.name} IS NOT NULL THEN ${providerModelsTable.name}
      ELSE ${providerModelsTable.provider}
    END
  `.as("model");
  const context = sql<string>`
    CASE
      WHEN ${evaluationsTable.promptSetId} IS NOT NULL THEN ${promptSetsTable.title}
      ELSE ${evaluationsTable.protocolName}
    END
  `.as("context");
  const avgScore = sql<number>`
    CASE
      WHEN ${evaluationsTable.promptSetId} IS NULL THEN AVG(${evaluationsTable.score})
      ELSE NULL
    END
  `
    .mapWith(Number)
    .as("avg_score");
  const accuracy = sql<number>`
    CASE
      WHEN ${evaluationsTable.promptSetId} IS NULL THEN NULL
      ELSE SUM(${testResultsTable.score}) / COUNT(${testResultsTable.id})
    END
  `
    .mapWith(Number)
    .as("accuracy");
  const totalEvaluations = sql<number>`
    COUNT(DISTINCT ${evaluationsTable.id})
  `
    .mapWith(Number)
    .as("total_evaluations");
  const recentEvaluation = sql<Date>`
    MAX(${evaluationsTable.finishedAt})
  `
    .mapWith((value) => new Date(value))
    .as("recent_evaluation");
  const uniquePrompts = sql<number>`
    CASE
      WHEN ${evaluationsTable.promptSetId} IS NOT NULL
      THEN COUNT(DISTINCT ${promptsTable.id})
      ELSE NULL
    END
  `
    .mapWith(Number)
    .as("unique_prompts");
  const totalTestsPerformed = sql<number>`
    COUNT(${testResultsTable.id})
  `
    .mapWith(Number)
    .as("total_tests_performed");

  const protocolAddress = sql<string | null>`
    CASE
      WHEN ${evaluationsTable.promptSetId} IS NULL THEN ${evaluationsTable.protocolAddress}
      ELSE NULL
    END
  `.as("source_protocol_address"); // Prevent conflict with `evaluationsTable.protocolAddress`

  return qb
    .select({
      model,
      context,
      avgScore,
      accuracy,
      totalEvaluations,
      recentEvaluation,
      uniquePrompts,
      totalTestsPerformed,
      protocolAddress,
      promptSetId: evaluationsTable.promptSetId,
      promptType: sql<string | null>`${promptsTable.type}`.as("prompt_type"),
    })
    .from(testResultsTable)
    .innerJoin(
      evaluationsTable,
      eq(testResultsTable.evaluationId, evaluationsTable.id)
    )
    .leftJoin(
      promptSetsTable,
      eq(evaluationsTable.promptSetId, promptSetsTable.id)
    )
    .leftJoin(promptsTable, eq(testResultsTable.promptId, promptsTable.id))
    .leftJoin(
      providerModelsTable,
      eq(testResultsTable.modelId, providerModelsTable.id)
    )
    .groupBy(
      model,
      context,
      promptsTable.type,
      evaluationsTable.promptSetId,
      protocolAddress
    )
    .having(
      or(
        sql`
        (
          CASE WHEN ${evaluationsTable.promptSetId} IS NULL
            THEN AVG(${evaluationsTable.score})
            ELSE NULL
          END
        ) > 0
      `,
        sql`
        (
          CASE WHEN ${evaluationsTable.promptSetId} IS NULL
            THEN NULL
            ELSE SUM(${testResultsTable.score}) / COUNT(${testResultsTable.id})
          END
        ) > 0
      `
      )
    );
});

export const usersView = pgView("v_users").as((qb) => {
  return qb
    .select({
      id: authUsers.id,
      email: authUsers.email,
      lastLogin: authUsers.lastSignInAt,

      displayName: userProfileTable.displayName,
      orgName: orgsTable.name,
      orgCountry: orgsTable.country,
      referralCode: userProfileTable.referralCode,
      orgId: sql<number | null>`${orgsTable.id}`.as("org_id"),

      // Social links
      github: userProfileTable.github,
      website: userProfileTable.website,
      bluesky: userProfileTable.bluesky,
      mastodon: userProfileTable.mastodon,
      twitter: userProfileTable.twitter,

      createdAt: userProfileTable.createdAt,
      updatedAt: userProfileTable.updatedAt,
    })
    .from(authUsers)
    .innerJoin(userProfileTable, eq(userProfileTable.userId, authUsers.id))
    .leftJoin(orgToPeopleTable, eq(orgToPeopleTable.userId, authUsers.id))
    .leftJoin(orgsTable, eq(orgsTable.id, orgToPeopleTable.orgId));
});

export const userStatsView = pgView("v_user_stats").as((qb) => {
  const commentsSubQuery = qb.$with("sq_prompt_comments").as(
    qb
      .select({
        id: promptCommentsTable.id,
        userId: promptCommentsTable.userId,
      })
      .from(promptCommentsTable)
      .unionAll(
        qb
          .select({
            id: responseCommentsTable.id,
            userId: responseCommentsTable.userId,
          })
          .from(responseCommentsTable)
      )
      .unionAll(
        qb
          .select({
            id: scoreCommentsTable.id,
            userId: scoreCommentsTable.userId,
          })
          .from(scoreCommentsTable)
      )
  );

  const promptQuickFeedbacksSubQuery = qb.$with("sq_prompt_quick_feedbacks").as(
    qb
      .select({
        userId: quickFeedbacksTable.userId,
        promptSetQuickFeedbackCount: sql<number>`
          COALESCE(COUNT(DISTINCT ${promptSetsTable.id}), 0)
        `
          .mapWith(Number)
          .as("prompt_set_feedback_count"),
        promptQuickFeedbackCount: sql<number>`
          COUNT(DISTINCT ${quickFeedbacksTable.id})
          FILTER (WHERE ${quickFeedbacksTable.promptId} IS NOT NULL)
        `
          .mapWith(Number)
          .as("prompt_quick_feedback_count"),
      })
      .from(quickFeedbacksTable)
      .leftJoin(
        promptSetPrompts,
        eq(promptSetPrompts.promptId, quickFeedbacksTable.promptId)
      )
      .leftJoin(
        promptSetsTable,
        eq(promptSetPrompts.promptSetId, promptSetsTable.id)
      )
      .groupBy(quickFeedbacksTable.userId)
  );

  const contributedPromptsSubQuery = qb.$with("sq_contributed_prompts").as(
    qb
      .select({
        userId: hashRegistrationsTable.uploaderId,
        uploadedPromptCount:
          sql<number>`COALESCE(COUNT(DISTINCT ${promptsTable.id}), 0)`
            .mapWith(Number)
            .as("uploaded_prompt_count"),
        generatedPromptCount: sql<number>`
          COUNT(${promptsTable.id})
          FILTER (WHERE ${promptsTable.metadata}->>'generated-via' = 'peerbench-webapp')
        `
          .mapWith(Number)
          .as("generated_prompt_count"),
        verifiedPromptCount: sql<number>`
          COUNT(DISTINCT ${promptsTable.id})
          FILTER (WHERE ${promptSetPrompts.status} = 'included')
        `
          .mapWith(Number)
          .as("verified_prompt_count"),
      })
      .from(promptsTable)
      .innerJoin(
        hashRegistrationsTable,
        and(
          eq(hashRegistrationsTable.cid, promptsTable.hashCIDRegistration),
          eq(hashRegistrationsTable.sha256, promptsTable.hashSha256Registration)
        )
      )
      .leftJoin(
        promptSetPrompts,
        eq(promptSetPrompts.promptId, promptsTable.id)
      )
      .groupBy(hashRegistrationsTable.uploaderId)
  );

  const quickFeedbacksSelfJoinTable = aliasedTable(quickFeedbacksTable, "qf");
  const avgPromptQuickFeedbackConsensusSubQuery = qb
    .$with("sq_avg_prompt_quick_feedback_consensus")
    .as(
      qb
        .select({
          userId: quickFeedbacksTable.userId,
          avgConsensus: sql<number>`
            COALESCE(
              (COUNT(*) FILTER (
                WHERE
                  ${quickFeedbacksSelfJoinTable.promptId} = ${quickFeedbacksTable.promptId} AND
                  ${quickFeedbacksSelfJoinTable.opinion} = ${quickFeedbacksTable.opinion}
              ))::numeric(5, 2)
              /
              NULLIF(
                (COUNT(*) FILTER (
                  WHERE ${quickFeedbacksSelfJoinTable.promptId} = ${quickFeedbacksTable.promptId}
                )),
                0
              ),
              0
            )
          `
            .mapWith(Number)
            .as("avg_consensus"),
        })
        .from(quickFeedbacksTable)
        .leftJoin(
          quickFeedbacksSelfJoinTable,

          // Ignore the quick feedbacks made by the same user
          ne(quickFeedbacksSelfJoinTable.userId, quickFeedbacksTable.userId)
        )
        .groupBy(quickFeedbacksTable.userId)
    );

  const avgScoreCreatedPromptSetsSubQuery = qb
    .$with("sq_avg_score_created_prompt_sets")
    .as(
      qb
        .select({
          avgScore: sql<number>`COALESCE(AVG(${scoresTable.score}), 0)`
            .mapWith(Number)
            .as("avg_score_of_created_prompt_sets"),
          ownerId: promptSetsTable.ownerId,
        })
        .from(promptSetsTable)
        .leftJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptSetId, promptSetsTable.id)
        )
        .leftJoin(
          scoresTable,
          eq(scoresTable.promptId, promptSetPrompts.promptId)
        )
        .groupBy(promptSetsTable.ownerId)
    );

  const avgScoreCoAuthoredPromptSetsSubQuery = qb
    .$with("sq_avg_score_co_authored_prompt_sets")
    .as(
      qb
        .select({
          avgScore: sql<number>`COALESCE(AVG(${scoresTable.score}), 0)`
            .mapWith(Number)
            .as("avg_score_of_co_authored_prompt_sets"),
          coAuthorId: userRoleOnPromptSetTable.userId,
        })
        .from(promptSetsTable)
        .leftJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptSetId, promptSetsTable.id)
        ) // TODO: Should we get the Prompt Sets that user has contributed in any way or only has a role in it? Currently it's only the Prompt Sets that user has a role in.
        .leftJoin(
          userRoleOnPromptSetTable,
          eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
        )
        .leftJoin(
          scoresTable,
          eq(scoresTable.promptId, promptSetPrompts.promptId)
        )
        .groupBy(userRoleOnPromptSetTable.userId)
    );

  return qb
    .with(
      promptQuickFeedbacksSubQuery,
      contributedPromptsSubQuery,
      avgPromptQuickFeedbackConsensusSubQuery,
      avgScoreCreatedPromptSetsSubQuery,
      avgScoreCoAuthoredPromptSetsSubQuery,
      commentsSubQuery
    )
    .select({
      id: authUsers.id,
      createdPromptSetCount:
        sql<number>`COALESCE(COUNT(DISTINCT ${promptSetsTable.id}), 0)`
          .mapWith(Number)
          .as("created_prompt_set_count"),
      totalCommentCount:
        sql<number>`COALESCE(COUNT(DISTINCT ${commentsSubQuery.id}), 0)`
          .mapWith(Number)
          .as("total_comment_count"),
      promptQuickFeedbackCount:
        promptQuickFeedbacksSubQuery.promptQuickFeedbackCount,
      promptSetQuickFeedbackCount:
        promptQuickFeedbacksSubQuery.promptSetQuickFeedbackCount,
      coCreatedPromptSetCount:
        sql<number>`COALESCE(COUNT(DISTINCT ${userRoleOnPromptSetTable.promptSetId}), 0)`
          .mapWith(Number)
          .as("co_created_prompt_set_count"),
      uploadedPromptCount: contributedPromptsSubQuery.uploadedPromptCount,
      generatedPromptCount: contributedPromptsSubQuery.generatedPromptCount,
      verifiedPromptCount: contributedPromptsSubQuery.verifiedPromptCount,
      avgPromptQuickFeedbackConsensus:
        avgPromptQuickFeedbackConsensusSubQuery.avgConsensus,
      avgScoreCreatedPromptSets: avgScoreCreatedPromptSetsSubQuery.avgScore,
      avgScoreCoAuthoredPromptSets:
        avgScoreCoAuthoredPromptSetsSubQuery.avgScore,
      referredUsersCount:
        sql<number>`COALESCE(COUNT(DISTINCT ${userProfileTable.userId}), 0)`
          .mapWith(Number)
          .as("referred_users_count"),
    })
    .from(authUsers)
    .leftJoin(userProfileTable, eq(userProfileTable.invitedBy, authUsers.id)) // Referred users
    .leftJoin(promptSetsTable, eq(promptSetsTable.ownerId, authUsers.id))
    .leftJoin(
      userRoleOnPromptSetTable,
      eq(userRoleOnPromptSetTable.userId, authUsers.id)
    )
    .leftJoin(
      promptQuickFeedbacksSubQuery,
      eq(promptQuickFeedbacksSubQuery.userId, authUsers.id)
    )
    .leftJoin(
      contributedPromptsSubQuery,
      eq(contributedPromptsSubQuery.userId, authUsers.id)
    )
    .leftJoin(
      avgPromptQuickFeedbackConsensusSubQuery,
      eq(avgPromptQuickFeedbackConsensusSubQuery.userId, authUsers.id)
    )
    .leftJoin(
      avgScoreCreatedPromptSetsSubQuery,
      eq(avgScoreCreatedPromptSetsSubQuery.ownerId, authUsers.id)
    )
    .leftJoin(
      avgScoreCoAuthoredPromptSetsSubQuery,
      eq(avgScoreCoAuthoredPromptSetsSubQuery.coAuthorId, authUsers.id)
    )
    .leftJoin(commentsSubQuery, eq(commentsSubQuery.userId, authUsers.id))
    .groupBy(
      authUsers.id,
      promptQuickFeedbacksSubQuery.promptQuickFeedbackCount,
      promptQuickFeedbacksSubQuery.promptSetQuickFeedbackCount,
      contributedPromptsSubQuery.uploadedPromptCount,
      contributedPromptsSubQuery.generatedPromptCount,
      contributedPromptsSubQuery.verifiedPromptCount,
      avgPromptQuickFeedbackConsensusSubQuery.avgConsensus,
      avgScoreCreatedPromptSetsSubQuery.avgScore,
      avgScoreCoAuthoredPromptSetsSubQuery.avgScore
    );
});

export type DbViewQuickFeedbackFlag = {
  id: number;
  flag: string;
  opinion: QuickFeedbackOpinion | null;
};
export const quickFeedbacksView = pgView("v_quick_feedbacks").as((qb) => {
  const flagsAggregation = jsonbAgg(
    jsonbBuildObject({
      id: quickFeedbackFlagsTable.id,
      flag: quickFeedbackFlagsTable.flag,
      opinion: quickFeedbackFlagsTable.opinion,
    }),
    {
      filterWhere: isNotNull(quickFeedbackFlagsTable.flag),
      fallbackEmptyArray: true,
    }
  );

  return qb
    .select({
      id: quickFeedbacksTable.id,
      createdAt: quickFeedbacksTable.createdAt,
      promptId: quickFeedbacksTable.promptId,
      responseId: quickFeedbacksTable.responseId,
      scoreId: quickFeedbacksTable.scoreId,
      opinion: quickFeedbacksTable.opinion,
      userId: quickFeedbacksTable.userId,
      flags: flagsAggregation.as("flags"),
    })
    .from(quickFeedbacksTable)
    .leftJoin(
      quickFeedbacks_quickFeedbackFlagsTable,
      eq(
        quickFeedbacks_quickFeedbackFlagsTable.quickFeedbackId,
        quickFeedbacksTable.id
      )
    )
    .leftJoin(
      quickFeedbackFlagsTable,
      eq(
        quickFeedbackFlagsTable.id,
        quickFeedbacks_quickFeedbackFlagsTable.flagId
      )
    )
    .groupBy(quickFeedbacksTable.id, quickFeedbacksTable.userId);
});

export const modelScoresPerPromptView = pgView("v_model_scores_per_prompt").as(
  (qb) => {
    const doCommonJoins = <T extends PgSelectQueryBuilder>(q: T) => {
      return q
        .innerJoin(scoresTable, eq(scoresTable.promptId, promptsTable.id))
        .innerJoin(
          responsesTable,
          eq(responsesTable.id, scoresTable.responseId)
        );
    };

    const responseTime = sql<number>`
      EXTRACT (EPOCH FROM (${responsesTable.finishedAt} - ${responsesTable.startedAt}))
    `
      .mapWith(Number)
      .as("response_time");

    const providerModelsQuery = doCommonJoins(
      qb
        .select({
          promptId: scoresTable.promptId,
          scoreId: scoresTable.id,
          score: scoresTable.score,
          model: providerModelsTable.modelId,
          responseTime,
          associatedWithKnownModel: sql<boolean>`false`.as(
            "associated_with_known_model"
          ),
        })
        .from(promptsTable)
        .$dynamic()
    ).innerJoin(
      providerModelsTable,
      and(
        eq(providerModelsTable.id, responsesTable.modelId),
        isNull(providerModelsTable.knownModelId)
      )
    );

    const knownModelsQuery = doCommonJoins(
      qb
        .select({
          promptId: scoresTable.promptId,
          scoreId: scoresTable.id,
          score: scoresTable.score,
          model: knownModelsTable.name,
          responseTime,
          associatedWithKnownModel: sql<boolean>`true`,
        })
        .from(promptsTable)
        .$dynamic()
    )
      .innerJoin(
        providerModelsTable,
        eq(providerModelsTable.id, responsesTable.modelId)
      )
      .innerJoin(
        knownModelsTable,
        eq(knownModelsTable.id, providerModelsTable.knownModelId)
      );

    return providerModelsQuery.union(knownModelsQuery);
  }
);

export const modelLeaderboardPerPromptSetView = pgView(
  "v_model_leaderboard_per_prompt_set"
).as((qb) => {
  return qb
    .select({
      promptSetId: promptSetPrompts.promptSetId,
      model: modelScoresPerPromptView.model,
      avgScore: avg(modelScoresPerPromptView.score).as("avg_score"),
      avgResponseTime: avg(modelScoresPerPromptView.responseTime).as(
        "avg_response_time"
      ),
      totalPromptsTested: countDistinct(modelScoresPerPromptView.promptId).as(
        "total_prompts_tested"
      ),
      totalScore: sum(modelScoresPerPromptView.score).as("total_score"),
      totalScoreCount: count(modelScoresPerPromptView.scoreId).as(
        "total_score_count"
      ),
    })
    .from(modelScoresPerPromptView)
    .innerJoin(
      promptSetPrompts,
      and(
        eq(promptSetPrompts.promptId, modelScoresPerPromptView.promptId),
        eq(promptSetPrompts.status, PromptStatuses.included)
      )
    )
    .groupBy(promptSetPrompts.promptSetId, modelScoresPerPromptView.model);
});

export type UploadContributionType = "prompt" | "response" | "score";
export const uploadContributorsPerPromptSetView = pgView(
  "v_upload_contributors_per_prompt_set"
).as((qb) => {
  const promptUploadContributions = qb
    .select({
      promptSetId: promptSetsTable.id,
      uploaderId: promptsTable.uploaderId,
      contributionType: sql<UploadContributionType>`'prompt'`.as(
        "collaboration_type"
      ),
    })
    .from(promptSetsTable)
    .innerJoin(
      promptSetPrompts,
      and(
        eq(promptSetPrompts.promptSetId, promptSetsTable.id),
        eq(promptSetPrompts.status, PromptStatuses.included)
      )
    )
    .innerJoin(promptsTable, eq(promptsTable.id, promptSetPrompts.promptId));
  const responseUploadContributions = qb
    .select({
      promptSetId: promptSetsTable.id,
      uploaderId: responsesTable.uploaderId,
      contributionType: sql<UploadContributionType>`'response'`.as(
        "collaboration_type"
      ),
    })
    .from(promptSetsTable)
    .innerJoin(
      promptSetPrompts,
      and(
        eq(promptSetPrompts.promptSetId, promptSetsTable.id),
        eq(promptSetPrompts.status, PromptStatuses.included)
      )
    )
    .innerJoin(
      responsesTable,
      eq(responsesTable.id, promptSetPrompts.promptId)
    );
  const scoreUploadContributions = qb
    .select({
      promptSetId: promptSetsTable.id,
      uploaderId: scoresTable.uploaderId,
      contributionType: sql<UploadContributionType>`'score'`.as(
        "collaboration_type"
      ),
    })
    .from(promptSetsTable)
    .innerJoin(
      promptSetPrompts,
      and(
        eq(promptSetPrompts.promptSetId, promptSetsTable.id),
        eq(promptSetPrompts.status, PromptStatuses.included)
      )
    )
    .innerJoin(scoresTable, eq(scoresTable.id, promptSetPrompts.promptId));

  const unionQuery = promptUploadContributions
    .union(responseUploadContributions)
    .union(scoreUploadContributions)
    .as("query");

  return qb
    .select({
      // Alias the column name for clarity
      promptSetId: sql<number>`${unionQuery.promptSetId}`.as("prompt_set_id"),
      uploaderId: unionQuery.uploaderId,
      contributionType: unionQuery.contributionType,
    })
    .from(unionQuery)
    .groupBy(
      unionQuery.uploaderId,
      unionQuery.promptSetId,
      unionQuery.contributionType
    );
});

export type ReviewContributionType = "response" | "prompt" | "score";
export const reviewContributorsPerPromptSetView = pgView(
  "v_review_contributors_per_prompt_set"
).as((qb) => {
  const promptStatusCondition = eq(
    promptSetPrompts.status,
    PromptStatuses.included
  );

  const promptReviews = qb
    .select({
      promptSetId: promptSetPrompts.promptSetId,
      userId: quickFeedbacksTable.userId,
      contributionType: sql<ReviewContributionType>`'prompt'`.as(
        "contribution_type"
      ),
    })
    .from(promptSetPrompts)
    .leftJoin(promptsTable, eq(promptsTable.id, promptSetPrompts.promptId))
    .innerJoin(
      quickFeedbacksTable,
      eq(quickFeedbacksTable.promptId, promptsTable.id)
    )
    .where(promptStatusCondition);
  const responseReviews = qb
    .select({
      promptSetId: promptSetPrompts.promptSetId,
      userId: quickFeedbacksTable.userId,
      contributionType: sql<ReviewContributionType>`'response'`.as(
        "contribution_type"
      ),
    })
    .from(promptSetPrompts)
    .leftJoin(responsesTable, eq(responsesTable.id, promptSetPrompts.promptId))
    .innerJoin(
      quickFeedbacksTable,
      eq(quickFeedbacksTable.responseId, responsesTable.id)
    )
    .where(promptStatusCondition);
  const scoreReviews = qb
    .select({
      promptSetId: promptSetPrompts.promptSetId,
      userId: quickFeedbacksTable.userId,
      contributionType: sql<ReviewContributionType>`'score'`.as(
        "contribution_type"
      ),
    })
    .from(promptSetPrompts)
    .leftJoin(scoresTable, eq(scoresTable.id, promptSetPrompts.promptId))
    .innerJoin(
      quickFeedbacksTable,
      eq(quickFeedbacksTable.scoreId, scoresTable.id)
    )
    .where(promptStatusCondition);

  const unionQuery = promptReviews
    .union(responseReviews)
    .union(scoreReviews)
    .as("query");

  return qb
    .select()
    .from(unionQuery)
    .groupBy(
      unionQuery.userId,
      unionQuery.promptSetId,
      unionQuery.contributionType
    );
});

export const overallScorePerPromptSetView = pgView(
  "v_overall_score_per_prompt_set"
).as((qb) => {
  return qb
    .select({
      promptSetId: promptSetPrompts.promptSetId,
      totalScoreCount: count(scoresTable.id).as("total_score_count"),
      totalScore: sum(scoresTable.score).as("total_score"),
      avgScore: avg(scoresTable.score).as("avg_score"),
    })
    .from(promptSetPrompts)
    .leftJoin(scoresTable, eq(scoresTable.promptId, promptSetPrompts.promptId))
    .where(eq(promptSetPrompts.status, PromptStatuses.included))
    .groupBy(promptSetPrompts.promptSetId);
});

export const promptSetStatsView = pgView("v_prompt_set_stats").as((qb) => {
  // All the users who uploaded something to the Prompt Set
  const uploadContributorsQuery = qb
    .select({
      userId: uploadContributorsPerPromptSetView.uploaderId,
      promptSetId: uploadContributorsPerPromptSetView.promptSetId,
    })
    .from(uploadContributorsPerPromptSetView);
  // All the users who reviewed something in the Prompt Set
  const reviewContributorsQuery = qb
    .select({
      userId: reviewContributorsPerPromptSetView.userId,
      promptSetId: reviewContributorsPerPromptSetView.promptSetId,
    })
    .from(reviewContributorsPerPromptSetView);
  // All the users who have a role (aka collaborators) on the Prompt Set
  const collaboratorsQuery = qb
    .select({
      userId: userRoleOnPromptSetTable.userId,
      promptSetId: userRoleOnPromptSetTable.promptSetId,
    })
    .from(userRoleOnPromptSetTable);
  const allContributorsQuery = uploadContributorsQuery
    .union(reviewContributorsQuery)
    .union(collaboratorsQuery)
    .as("all_contributors");

  return qb
    .select({
      id: promptSetsTable.id,
      includedPromptCount: sql<number>`
        COUNT(DISTINCT ${promptSetPrompts.promptId})
        FILTER (WHERE ${eq(promptSetPrompts.status, PromptStatuses.included)})
      `
        .mapWith(Number)
        .as("included_prompt_count"),
      excludedPromptCount: sql<number>`
        COUNT(DISTINCT ${promptSetPrompts.promptId})
        FILTER (WHERE ${eq(promptSetPrompts.status, PromptStatuses.excluded)})
      `
        .mapWith(Number)
        .as("excluded_prompt_count"),
      totalScoreCount: overallScorePerPromptSetView.totalScoreCount,
      overallAvgScore: overallScorePerPromptSetView.avgScore,
      totalContributors: sql<number>`
        COALESCE(${countDistinct(allContributorsQuery.userId)}, 0)
      `
        .mapWith(Number)
        .as("total_contributors"),
    })
    .from(promptSetsTable)
    .leftJoin(
      promptSetPrompts,
      eq(promptSetPrompts.promptSetId, promptSetsTable.id)
    )
    .leftJoin(
      allContributorsQuery,
      eq(
        // https://github.com/drizzle-team/drizzle-orm/issues/3731
        sql.join([
          new StringChunk(`"${allContributorsQuery._.alias}"`),
          new StringChunk("."),
          allContributorsQuery.promptSetId,
        ]),
        promptSetsTable.id
      )
    )
    .leftJoin(
      overallScorePerPromptSetView,
      eq(overallScorePerPromptSetView.promptSetId, promptSetsTable.id)
    )
    .groupBy(
      promptSetsTable.id,
      overallScorePerPromptSetView.totalScoreCount,
      overallScorePerPromptSetView.avgScore
    );
});

export const userNotificationSubscriptionsView = pgView(
  "v_user_notification_subscriptions"
).as((qb) => {
  const commentSubs = qb
    .select({
      promptId: promptCommentsTable.promptId,
      userId: promptCommentsTable.userId,
      reason:
        sql<UserNotificationSubscriptionReason>`${UserNotificationSubscriptionReasons.commented}`.as(
          "reason"
        ),
    })
    .from(promptCommentsTable);

  const quickFeedbackSubs = qb
    .select({
      promptId: quickFeedbacksTable.promptId,
      userId: quickFeedbacksTable.userId,
      reason:
        sql<UserNotificationSubscriptionReason>`${UserNotificationSubscriptionReasons.gaveQuickFeedback}`.as(
          "reason"
        ),
    })
    .from(quickFeedbacksTable)
    // TODO: Remove `where` clause if there are more entities (e.g scores, responses) that user should be subscribed after an interaction. Currently they are only Prompts.
    .where(isNotNull(quickFeedbacksTable.promptId));

  const ownPromptSubs = qb
    .select({
      promptId: sql<InferData<typeof promptsTable.id>>`${promptsTable.id}`.as(
        "prompt_id"
      ),
      userId: promptsTable.uploaderId,
      reason:
        sql<UserNotificationSubscriptionReason>`${UserNotificationSubscriptionReasons.owns}`.as(
          "reason"
        ),
    })
    .from(promptsTable);

  return commentSubs.union(quickFeedbackSubs).union(ownPromptSubs);
});

// export const modelScoreStatsPerPromptView = pgView(
//   "v_model_score_stats_per_prompt"
// ).as((qb) => {
//   return qb
//     .select({
//       promptId: responsesTable.promptId,
//       modelId: sql<string>`${providerModelsTable.modelId}`.as("model_id"),
//       scoreCount: count(scoresTable.id).as("score_count"),
//       goodScoreCount: sql<number>`
//       SUM(1) FILTER (WHERE ${scoresTable.score} >= ${goodScoreThreshold})
//     `
//         .mapWith(Number)
//         .as("good_score_count"),
//       badScoreCount: sql<number>`
//       SUM(1) FILTER (WHERE ${scoresTable.score} <= ${badScoreThreshold})
//     `
//         .mapWith(Number)
//         .as("bad_score_count"),
//       avgScore: sql<number>`AVG(${scoresTable.score})`
//         .mapWith(Number)
//         .as("avg_score"),
//       totalScore: sql<number>`SUM(${scoresTable.score})`
//         .mapWith(Number)
//         .as("total_score"),
//     })
//     .from(responsesTable)
//     .leftJoin(scoresTable, eq(responsesTable.id, scoresTable.responseId))
//     .leftJoin(
//       providerModelsTable,
//       eq(responsesTable.modelId, providerModelsTable.id)
//     )
//     .groupBy(responsesTable.promptId, providerModelsTable.modelId);
// });

// export const promptsWithStatsView = pgView("v_prompts_with_stats").as((qb) => {
//   return qb
//     .select({
//       id: promptsTable.id,
//       type: promptsTable.type,

//       question: promptsTable.question,
//       cid: promptsTable.cid,
//       sha256: promptsTable.sha256,

//       options: promptsTable.options,
//       answerKey: promptsTable.answerKey,
//       answer: promptsTable.answer,

//       fullPrompt: promptsTable.fullPrompt,
//       fullPromptCID: promptsTable.fullPromptCID,
//       fullPromptSHA256: promptsTable.fullPromptSHA256,

//       metadata: promptsTable.metadata,
//       createdAt: promptsTable.createdAt,

//       positiveQuickFeedbacks: sql<number>`
//         COUNT(DISTINCT ${quickFeedbacksView.id})
//         FILTER (WHERE ${eq(quickFeedbacksView.opinion, QuickFeedbackOpinions.positive)})
//       `
//         .mapWith(Number)
//         .as("positive_quick_feedbacks"),
//       negativeQuickFeedbacks: sql<number>`
//         COUNT(DISTINCT ${quickFeedbacksView.id})
//         FILTER (WHERE ${eq(quickFeedbacksView.opinion, QuickFeedbackOpinions.negative)})
//       `
//         .mapWith(Number)
//         .as("negative_quick_feedbacks"),
//     })
//     .from(promptsTable)
//     .leftJoin(
//       quickFeedbacksView,
//       eq(quickFeedbacksView.promptId, promptsTable.id)
//     );
// });

/**************************************************
 * Current Ranking Views                          *
 **************************************************/

export const currentReviewerTrustView = pgView("v_current_reviewer_trust").as(
  (qb) => {
    const latestComputation = qb
      .select({ id: rankingComputationsTable.id })
      .from(rankingComputationsTable)
      .orderBy(sql`${rankingComputationsTable.computedAt} DESC`)
      .limit(1)
      .as("latest");

    return qb
      .select({
        userId: rankingReviewerTrustTable.userId,
        trustScore: rankingReviewerTrustTable.trustScore,
        computedAt: rankingComputationsTable.computedAt,
        displayName: userProfileTable.displayName,
        email: sql<string | null>`
        CASE 
          WHEN ${authUsers.email} IS NOT NULL THEN
            CONCAT(
              '***@',
              SUBSTRING(${authUsers.email} FROM POSITION('@' IN ${authUsers.email}) + 1)
            )
          ELSE NULL
        END
      `.as("email"),
      })
      .from(rankingReviewerTrustTable)
      .innerJoin(
        rankingComputationsTable,
        eq(rankingReviewerTrustTable.computationId, rankingComputationsTable.id)
      )
      .leftJoin(authUsers, eq(authUsers.id, rankingReviewerTrustTable.userId))
      .leftJoin(
        userProfileTable,
        eq(userProfileTable.userId, rankingReviewerTrustTable.userId)
      )
      .where(
        eq(
          rankingReviewerTrustTable.computationId,
          sql`(SELECT ${latestComputation.id} FROM ${latestComputation})`
        )
      );
  }
);

export const currentPromptQualityView = pgView("v_current_prompt_quality").as(
  (qb) => {
    const latestComputation = qb
      .select({ id: rankingComputationsTable.id })
      .from(rankingComputationsTable)
      .orderBy(sql`${rankingComputationsTable.computedAt} DESC`)
      .limit(1)
      .as("latest");

    return qb
      .select({
        promptId: rankingPromptQualityTable.promptId,
        qualityScore: rankingPromptQualityTable.qualityScore,
        reviewCount: rankingPromptQualityTable.reviewCount,
        computedAt: rankingComputationsTable.computedAt,
      })
      .from(rankingPromptQualityTable)
      .innerJoin(
        rankingComputationsTable,
        eq(rankingPromptQualityTable.computationId, rankingComputationsTable.id)
      )
      .where(
        eq(
          rankingPromptQualityTable.computationId,
          sql`(SELECT ${latestComputation.id} FROM ${latestComputation})`
        )
      );
  }
);

export const currentBenchmarkQualityView = pgView(
  "v_current_benchmark_quality"
).as((qb) => {
  const latestComputation = qb
    .select({ id: rankingComputationsTable.id })
    .from(rankingComputationsTable)
    .orderBy(sql`${rankingComputationsTable.computedAt} DESC`)
    .limit(1)
    .as("latest");

  return qb
    .select({
      promptSetId: rankingBenchmarkQualityTable.promptSetId,
      qualityScore: rankingBenchmarkQualityTable.qualityScore,
      computedAt: rankingComputationsTable.computedAt,
    })
    .from(rankingBenchmarkQualityTable)
    .innerJoin(
      rankingComputationsTable,
      eq(
        rankingBenchmarkQualityTable.computationId,
        rankingComputationsTable.id
      )
    )
    .where(
      eq(
        rankingBenchmarkQualityTable.computationId,
        sql`(SELECT ${latestComputation.id} FROM ${latestComputation})`
      )
    );
});

export const currentModelPerformanceView = pgView(
  "v_current_model_performance"
).as((qb) => {
  const latestComputation = qb
    .select({ id: rankingComputationsTable.id })
    .from(rankingComputationsTable)
    .orderBy(sql`${rankingComputationsTable.computedAt} DESC`)
    .limit(1)
    .as("latest");

  return qb
    .select({
      model: rankingModelPerformanceTable.model,
      score: rankingModelPerformanceTable.score,
      promptsTestedCount: rankingModelPerformanceTable.promptsTestedCount,
      computedAt: rankingComputationsTable.computedAt,
    })
    .from(rankingModelPerformanceTable)
    .innerJoin(
      rankingComputationsTable,
      eq(
        rankingModelPerformanceTable.computationId,
        rankingComputationsTable.id
      )
    )
    .where(
      eq(
        rankingModelPerformanceTable.computationId,
        sql`(SELECT ${latestComputation.id} FROM ${latestComputation})`
      )
    );
});

export const currentModelEloView = pgView("v_current_model_elo").as((qb) => {
  const latestComputation = qb
    .select({ id: rankingComputationsTable.id })
    .from(rankingComputationsTable)
    .orderBy(sql`${rankingComputationsTable.computedAt} DESC`)
    .limit(1)
    .as("latest");

  return qb
    .select({
      model: rankingModelEloTable.model,
      eloScore: rankingModelEloTable.eloScore,
      winCount: rankingModelEloTable.winCount,
      lossCount: rankingModelEloTable.lossCount,
      matchCount: rankingModelEloTable.matchCount,
      computedAt: rankingComputationsTable.computedAt,
    })
    .from(rankingModelEloTable)
    .innerJoin(
      rankingComputationsTable,
      eq(rankingModelEloTable.computationId, rankingComputationsTable.id)
    )
    .where(
      eq(
        rankingModelEloTable.computationId,
        sql`(SELECT ${latestComputation.id} FROM ${latestComputation})`
      )
    );
});

export const currentContributorScoreView = pgView(
  "v_current_contributor_score"
).as((qb) => {
  const latestComputation = qb
    .select({ id: rankingComputationsTable.id })
    .from(rankingComputationsTable)
    .orderBy(sql`${rankingComputationsTable.computedAt} DESC`)
    .limit(1)
    .as("latest");

  return qb
    .select({
      userId: rankingContributorScoreTable.userId,
      score: rankingContributorScoreTable.score,
      promptCount: rankingContributorScoreTable.promptCount,
      alignedReviewCount: rankingContributorScoreTable.alignedReviewCount,
      commentCount: rankingContributorScoreTable.commentCount,
      computedAt: rankingComputationsTable.computedAt,
      displayName: userProfileTable.displayName,
      email: sql<string | null>`
        CASE 
          WHEN ${authUsers.email} IS NOT NULL THEN
            CONCAT(
              '***@',
              SUBSTRING(${authUsers.email} FROM POSITION('@' IN ${authUsers.email}) + 1)
            )
          ELSE NULL
        END
      `.as("email"),
    })
    .from(rankingContributorScoreTable)
    .innerJoin(
      rankingComputationsTable,
      eq(
        rankingContributorScoreTable.computationId,
        rankingComputationsTable.id
      )
    )
    .leftJoin(authUsers, eq(authUsers.id, rankingContributorScoreTable.userId))
    .leftJoin(
      userProfileTable,
      eq(userProfileTable.userId, rankingContributorScoreTable.userId)
    )
    .where(
      eq(
        rankingContributorScoreTable.computationId,
        sql`(SELECT ${latestComputation.id} FROM ${latestComputation})`
      )
    );
});
