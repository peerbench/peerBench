import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import {
  GetPromptScoresStatusReturnItem,
  PromptScoreService,
} from "@/services/prompt-score.service";
import { baseScoreIdentifierSchema } from "@/validation/base-score-identifier";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  scores: z.array(baseScoreIdentifierSchema).max(1000).min(1),
});

/**
 * Returns the status of the given Prompt Scores. It is a POST
 * endpoint to have a larger payload size limit.
 */
export const POST = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    const { scores } = ctx.body;
    const statuses = await PromptScoreService.getPromptScoresStatuses({
      scores,
    });
    return NextResponse.json(statuses);
  });

export type ResponseType = GetPromptScoresStatusReturnItem[];
export type RequestBodyType = z.input<typeof bodySchema>;
