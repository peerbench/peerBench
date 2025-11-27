import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { checkValidation } from "@/lib/route-helpers/check-validation";
import { PromptSetService } from "@/services/promptset.service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { EnumSchema } from "peerbench";
import { PromptSetLicenses } from "@/database/types";
import { DatabaseError } from "pg";
import { pathParams } from "@/lib/route-kit/middlewares/path-params";
import { ApiError } from "@/errors/api-error";

const bodySchema = z.object(
  {
    title: z.string(),
    description: z.string().optional(),
    license: EnumSchema(PromptSetLicenses).optional(),
    category: z.string().optional(),
    citationInfo: z.string().optional(),
    isPublic: z.boolean().optional(),
    isPublicSubmissionsAllowed: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  },
  { message: "Missing body" }
);

export const PATCH = createHandler()
  .use(auth)
  .use(pathParams<{ id: string }>())
  .handle(async (req, ctx) => {
    const id = checkValidation(
      z.coerce.number({ message: "Invalid ID" }).safeParse(ctx.id)
    );
    const body = checkValidation(
      bodySchema.safeParse(
        // Fallback to empty object if no body is provided
        await req.json().catch(() => ({}))
      )
    );

    try {
      await PromptSetService.updatePromptSet(
        {
          category: body.category,
          citationInfo: body.citationInfo,
          description: body.description,
          isPublic: body.isPublic,
          isPublicSubmissionsAllowed: body.isPublicSubmissionsAllowed,
          license: body.license,
          title: body.title,
          tags: body.tags,
        },
        {
          filters: { id },
          requestedByUserId: ctx.userId,
        }
      );

      return NextResponse.json({ message: "Benchmark updated" });
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

export type ResponseType = { message: string };
export type RequestBody = z.input<typeof bodySchema>;
