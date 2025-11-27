import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import {
  InsertPromptSetData,
  PromptSetService,
} from "@/services/promptset.service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { EnumSchema } from "peerbench";
import { PromptSetLicenses } from "@/database/types";
import { DatabaseError } from "pg";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { ApiError } from "@/errors/api-error";
import { promptFiltersSchema } from "@/validation/api/prompt-filters";

const bodySchema = z
  .object(
    {
      title: z.string(),
      description: z.string().optional(),
      license: EnumSchema(PromptSetLicenses).optional(),
      category: z.string().optional(),
      citationInfo: z.string().optional(),
      isPublic: z.boolean().optional(),
      isPublicSubmissionsAllowed: z.boolean().optional(),
      promptsToInclude: promptFiltersSchema.optional(),
    },
    { message: "Missing body" }
  )
  .transform((value, ctx) => {
    if (!value.isPublic && value.isPublicSubmissionsAllowed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Public submissions are not allowed for non-public Benchmarks",
      });
      return z.NEVER;
    }

    return value;
  });

export const POST = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    try {
      const promptSet = await PromptSetService.insertPromptSet({
        ownerId: ctx.userId,
        description: ctx.body.description,
        title: ctx.body.title,
        license: ctx.body.license,
        category: ctx.body.category,
        citationInfo: ctx.body.citationInfo,
        isPublic: ctx.body.isPublic,
        isPublicSubmissionsAllowed: ctx.body.isPublicSubmissionsAllowed,
        promptsToInclude: ctx.body.promptsToInclude,
      });

      return NextResponse.json(promptSet);
    } catch (err) {
      console.error(err);

      if (
        err instanceof DatabaseError &&
        err.code === "23505" &&
        err.detail?.includes("already exists")
      ) {
        throw ApiError.badRequest(
          "Another Benchmark with the same title is already exist"
        );
      }

      throw err;
    }
  });

export type ResponseType = InsertPromptSetData;
export type RequestBody = z.input<typeof bodySchema>;
