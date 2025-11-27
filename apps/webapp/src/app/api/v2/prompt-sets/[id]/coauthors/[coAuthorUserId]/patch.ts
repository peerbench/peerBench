import { UserRoleOnPromptSet } from "@/database/types";
import { checkValidation } from "@/lib/route-helpers/check-validation";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { pathParams } from "@/lib/route-kit/middlewares/path-params";
import { PromptSetService } from "@/services/promptset.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  newRole: z.nativeEnum(UserRoleOnPromptSet).optional(),
});

export const PATCH = createHandler()
  .use(auth)
  .use(pathParams<{ id: string; coAuthorUserId: string }>())
  .handle(async (req, ctx) => {
    const body = checkValidation(
      bodySchema.safeParse(await req.json().catch(() => ({})))
    );
    const id = checkValidation(
      z.coerce.number({ message: "Invalid ID" }).safeParse(ctx.id)
    );

    await PromptSetService.updateCoAuthorRole(
      {
        newRole: body.newRole,
      },
      {
        promptSetId: id,
        coAuthorUserId: ctx.coAuthorUserId,
        requestedByUserId: ctx.userId,
      }
    );

    return NextResponse.json({ message: "Co-author role updated" });
  });

export type ResponseType = { message: string };
export type RequestBody = z.input<typeof bodySchema>;
