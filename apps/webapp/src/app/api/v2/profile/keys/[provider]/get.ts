import { ApiKeyProviders } from "@/database/types";
import { ApiError } from "@/errors/api-error";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parsePathParams } from "@/lib/route-kit/middlewares/path-params";
import { ApiKeyService } from "@/services/apikey.service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const GET = createHandler()
  .use(auth)
  .use(
    parsePathParams({
      provider: z.nativeEnum(ApiKeyProviders),
    })
  )
  .handle(async (req, ctx) => {
    if (ctx.provider === ApiKeyProviders.openrouter) {
      const keyData = await ApiKeyService.upsertOpenRouterApiKey({
        assignedUserId: ctx.userId,
      });

      return NextResponse.json({
        key: keyData.key,
      });
    }

    if (ctx.provider === ApiKeyProviders.peerbench) {
      // List all PeerBench API keys for the user
      const apiKeys = await ApiKeyService.listPeerBenchApiKeys(ctx.userId);

      return NextResponse.json({
        keys: apiKeys,
      });
    }

    throw ApiError.notFound();
  });

export type ResponseType = {
  key: string;
};
