import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import {
  GetPromptsStatusReturnItem,
  PromptService,
} from "@/services/prompt.service";
import { basePromptIdentifierSchema } from "@/validation/base-prompt-identifier";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  prompts: z.array(basePromptIdentifierSchema).max(1000).min(1),
});

/**
 * Returns the status of the given Prompts. It is a POST
 * endpoint to have a larger payload size limit.
 */
export const POST = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    const { prompts } = ctx.body;
    const statuses = await PromptService.getPromptsStatuses({
      prompts,
    });
    return NextResponse.json(statuses);
  });

export type ResponseType = GetPromptsStatusReturnItem[];
export type RequestBodyType = z.input<typeof bodySchema>;
