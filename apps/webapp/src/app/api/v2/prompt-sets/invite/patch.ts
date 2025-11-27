import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { checkValidation } from "@/lib/route-helpers/check-validation";
import { PromptSetService } from "@/services/promptset.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object(
  {
    code: z.string(),
  },
  { message: "Missing body" }
);

export const PATCH = createHandler()
  .use(auth)
  .handle(async (req, ctx) => {
    const body = checkValidation(
      bodySchema.safeParse(await req.json().catch(() => ({})))
    );

    await PromptSetService.useInvitation({
      code: body.code,
      userId: ctx.userId,
    });

    return NextResponse.json({ message: "Invitation used" });
  });

export type ResponseType = {
  message: string;
};
export type RequestBody = z.input<typeof bodySchema>;
