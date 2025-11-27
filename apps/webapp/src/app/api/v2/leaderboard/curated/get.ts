import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import {
  GetCuratedLeaderboardReturn,
  PromptService,
} from "@/services/prompt.service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import { NULL_UUID } from "@/lib/constants";
import { promptFiltersSchema } from "@/validation/api/prompt-filters";
import { StringBool } from "@/validation/string-bool";

const querySchema = promptFiltersSchema.extend({
  minCoverage: z.coerce.number().min(0).max(100).optional(),
  promptAgeWeighting: z.enum(["none", "linear", "exponential"]).optional(),
  responseDelayWeighting: z.enum(["none", "linear", "exponential"]).optional(),
  revealedResponses: StringBool().optional(),
});

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const {
      accessReason,
      minCoverage,
      promptAgeWeighting,
      responseDelayWeighting,
      revealedResponses,
      ...filters
    } = safeParseQueryParams(req, querySchema);

    const result = await PromptService.getCuratedLeaderboard({
      accessReason,
      requestedByUserId: ctx.userId ?? NULL_UUID,
      filters,
      minCoverage,
      promptAgeWeighting,
      responseDelayWeighting,
      revealedResponses,
    });

    return NextResponse.json({
      data: result.leaderboard,
      stats: result.stats,
      promptSetDistribution: result.promptSetDistribution,
    });
  });

export type ResponseType = {
  data: GetCuratedLeaderboardReturn["leaderboard"];
  stats: GetCuratedLeaderboardReturn["stats"];
  promptSetDistribution: GetCuratedLeaderboardReturn["promptSetDistribution"];
};
export type RequestQueryParams = z.input<typeof querySchema>;
