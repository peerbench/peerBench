import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { ProfileService, UserProfile } from "@/services/user-profile.service";
import { StringBool } from "@/validation/string-bool";
import { NextResponse } from "next/server";
import { z } from "zod";

export const querySchema = z.object({
  stats: StringBool().optional(),
});

export const GET = createHandler()
  .use(auth)
  .handle(async (req, ctx) => {
    const query = safeParseQueryParams(req, querySchema);
    const profile = await ProfileService.getUserProfile({
      userId: ctx.userId,
      stats: query.stats,
    });

    return NextResponse.json(profile);
  });

export type ResponseType = UserProfile;
export type RequestQueryParams = z.input<typeof querySchema>;
