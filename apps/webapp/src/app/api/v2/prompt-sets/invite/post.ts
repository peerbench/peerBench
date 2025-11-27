import { UserRoleOnPromptSet } from "@/database/types";
import { checkValidation } from "@/lib/route-helpers/check-validation";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { PromptSetService } from "@/services/promptset.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object(
  {
    promptSetId: z.coerce.number(),
    role: z.nativeEnum(UserRoleOnPromptSet),
    isReusable: z.boolean().optional(),
  },
  { message: "Missing body" }
);

export const POST = createHandler()
  .use(auth)
  .handle(async (req, ctx) => {
    const body = checkValidation(
      bodySchema.safeParse(await req.json().catch(() => ({})))
    );

    const code = await PromptSetService.createInvitationCode(
      {
        promptSetId: body.promptSetId,
        role: body.role,
        createdBy: ctx.userId,
        isReusable: body.isReusable,
      },
      { requestedByUserId: ctx.userId }
    );

    return NextResponse.json({ code });
  });

export type ResponseType = {
  code: string;
};
export type RequestBody = z.input<typeof bodySchema>;
