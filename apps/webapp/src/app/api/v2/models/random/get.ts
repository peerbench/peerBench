import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { NextResponse } from "next/server";
import { z } from "zod";
import { OpenRouterProvider } from "peerbench";
import { ClientSideResponseType, NextResponseType } from "@/lib/utilities";
import { ApiError } from "@/errors/api-error";

const querySchema = z.object({
  count: z.coerce.number().int().min(1).max(10).default(2),
  excludeSlugs: z.array(z.string()).optional(),
});

export const GET = createHandler()
  .use(auth)
  .handle(async (req) => {
    const query = safeParseQueryParams(req, querySchema);

    // TODO: Currently we only support OpenRouter provider.
    const openRouterProvider = new OpenRouterProvider({ apiKey: "" });

    const models = await openRouterProvider.getModelDetails();

    if (models === undefined) {
      throw ApiError.server("Failed to get available models");
    }

    const filteredModels = models.filter((model) =>
      // Exclude models if the filter is provided
      query.excludeSlugs !== undefined && query.excludeSlugs.length > 0
        ? !query.excludeSlugs.includes(model.id)
        : true
    );
    const randomModels = filteredModels
      .sort(() => Math.random() - 0.5)
      .slice(0, query.count);

    return NextResponse.json({
      data: randomModels.map((m) => ({
        ...m,
        modelId: m.id,
      })),
      total: randomModels.length,
    });
  });

export type ResponseType = ClientSideResponseType<NextResponseType<typeof GET>>;
export type RequestQueryParams = z.input<typeof querySchema>;
