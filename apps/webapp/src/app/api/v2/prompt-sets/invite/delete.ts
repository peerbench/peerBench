import { checkValidation } from "@/lib/route-helpers/check-validation";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { PromptSetService } from "@/services/promptset.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  code: z.string(),
});

export const DELETE = createHandler()
  .use(auth)
  .handle(async (req, ctx) => {
    const body = checkValidation(
      bodySchema.safeParse(await req.json().catch(() => ({})))
    );

    await PromptSetService.revokeInvitation(
      {
        code: body.code,
      },
      {
        requestedByUserId: ctx.userId,
      }
    );

    return NextResponse.json({ message: "Invitation revoked" });
  });

export type ResponseType = {
  message: string;
};
export type RequestBody = z.input<typeof bodySchema>;
