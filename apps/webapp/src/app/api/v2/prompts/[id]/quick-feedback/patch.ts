import { QuickFeedbackOpinions } from "@/database/types";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { pathParams } from "@/lib/route-kit/middlewares/path-params";
import { QuickFeedbackService } from "@/services/quickfeedback.service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const bodySchema = z.object({
  opinion: z.nativeEnum(QuickFeedbackOpinions),
});

export const PATCH = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .use(pathParams<{ id: string }>())
  .handle(async (req, ctx) => {
    await QuickFeedbackService.upsertQuickFeedback(
      {
        promptId: ctx.id,
        userId: ctx.userId,
        opinion: ctx.body.opinion,
      },
      { requestedByUserId: ctx.userId }
    );
    return NextResponse.json({
      message: "Quick feedback updated",
      success: true,
    });
  });

export type ResponseType = {
  message?: string;
  success: boolean;
};
export type RequestBodyType = z.infer<typeof bodySchema>;
