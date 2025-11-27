import { PromptStatuses } from "@/database/types";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { parsePathParams } from "@/lib/route-kit/middlewares/path-params";
import { PromptSetService } from "@/services/promptset.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  promptId: z.string().uuid(),
});

export const POST = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .use(
    parsePathParams({
      id: z.coerce.number({ message: "Invalid ID" }),
    })
  )
  .handle(async (req, ctx) => {
    // Assign prompt to prompt set with "included" status
    await PromptSetService.updatePromptAssignmentStatus({
      promptId: ctx.body.promptId,
      promptSetId: ctx.id,
      status: PromptStatuses.included,
      requestedByUserId: ctx.userId,
    });

    return NextResponse.json({ 
      message: "Prompt assigned to benchmark successfully",
      success: true,
    });
  });

export type RequestBodyType = z.infer<typeof bodySchema>;
export type ResponseType = { 
  message: string;
  success: boolean;
};

