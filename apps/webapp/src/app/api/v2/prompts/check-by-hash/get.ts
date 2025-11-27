import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PromptService } from "@/services/prompt.service";

const querySchema = z.object({
  fullPromptCID: z.string(),
  fullPromptSHA256: z.string(),
  promptSetId: z.coerce.number().int().optional(),
});

export const GET = createHandler()
  .use(auth)
  .handle(async (req, ctx) => {
    const query = safeParseQueryParams(req, querySchema);

    const result = await PromptService.checkPromptByHash({
      fullPromptCID: query.fullPromptCID,
      fullPromptSHA256: query.fullPromptSHA256,
      promptSetId: query.promptSetId,
      requestedByUserId: ctx.userId,
    });

    return NextResponse.json(result);
  });

export type ResponseType = {
  exists: boolean;
  promptId: string | null;
  isAssignedToBenchmark: boolean | null;
};

