import { ApiKeyProviders } from "@/database/types";
import { ApiError } from "@/errors/api-error";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { parsePathParams } from "@/lib/route-kit/middlewares/path-params";
import { ApiKeyService } from "@/services/apikey.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().optional(),
});

export const POST = createHandler()
  .use(auth)
  .use(
    parsePathParams({
      provider: z.nativeEnum(ApiKeyProviders),
    })
  )
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    if (ctx.provider === ApiKeyProviders.peerbench) {
      // Create a new PeerBench API key
      const apiKey = await ApiKeyService.createPeerBenchApiKey({
        assignedUserId: ctx.userId,
        name: ctx.body.name,
      });

      return NextResponse.json(
        {
          id: apiKey.id,
          key: apiKey.key, // Show full key only on creation
          name: apiKey.metadata?.name,
          createdAt: apiKey.createdAt,
        },
        { status: 201 }
      );
    }

    throw ApiError.notFound();
  });

export type RequestBody = z.input<typeof bodySchema>;
export type ResponseType = {
  id: number;
  key: string;
  name: string;
  createdAt: Date;
};
