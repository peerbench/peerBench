import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import {
  GetPromptResponsesStatusReturnItem,
  PromptResponseService,
} from "@/services/prompt-response.service";
import { baseResponseIdentifierSchema } from "@/validation/base-response-identifier";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  responses: z.array(baseResponseIdentifierSchema).max(1000).min(1),
});

/**
 * Returns the status of the given Prompt Responses. It is a POST
 * endpoint to have a larger payload size limit.
 */
export const POST = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    const { responses } = ctx.body;
    const statuses = await PromptResponseService.getPromptResponsesStatuses({
      responses,
    });
    return NextResponse.json(statuses);
  });

export type ResponseType = GetPromptResponsesStatusReturnItem[];
export type RequestBodyType = z.input<typeof bodySchema>;
