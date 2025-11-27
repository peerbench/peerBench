import { PromptStatuses } from "@/database/types";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { parsePathParams } from "@/lib/route-kit/middlewares/path-params";
import { PromptSetService } from "@/services/promptset.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  // TODO: We only have two Prompt statuses that are actively used right now, that's why we are not using all of them.
  status: z.enum([PromptStatuses.excluded, PromptStatuses.included]),
});

export const PATCH = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .use(
    parsePathParams({
      id: z.coerce.number({ message: "Invalid ID" }),
      promptId: z.string(),
    })
  )
  .handle(async (req, ctx) => {
    await PromptSetService.updatePromptAssignmentStatus({
      promptId: ctx.promptId,
      promptSetId: ctx.id,
      status: ctx.body.status,
      requestedByUserId: ctx.userId,
    });

    return NextResponse.json({ message: "Prompt assignment updated" });
  });

export type ResponseType = { message: string };
export type RequestBody = z.input<typeof bodySchema>;
