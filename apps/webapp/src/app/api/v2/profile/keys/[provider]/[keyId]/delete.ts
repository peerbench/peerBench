import { ApiKeyProviders } from "@/database/types";
import { ApiError } from "@/errors/api-error";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parsePathParams } from "@/lib/route-kit/middlewares/path-params";
import { ApiKeyService } from "@/services/apikey.service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const DELETE = createHandler()
  .use(auth)
  .use(
    parsePathParams({
      provider: z.nativeEnum(ApiKeyProviders),
      keyId: z.coerce.number(),
    })
  )
  .handle(async (req, ctx) => {
    if (ctx.provider === ApiKeyProviders.peerbench) {
      // Delete the API key
      const deleted = await ApiKeyService.deleteApiKey(
        ctx.keyId,
        ctx.userId
      );

      if (!deleted) {
        throw ApiError.notFound("API key not found");
      }

      return NextResponse.json({ success: true });
    }

    throw ApiError.notFound();
  });

export type ResponseType = {
  success: boolean;
};
