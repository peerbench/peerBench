import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { NonRevealedPromptSchema, PromptSchema } from "peerbench";
import { SignatureKeyTypes, SignatureTypes } from "@/database/types";
import { PromptService } from "@/services/prompt.service";

export const bodySchema = z.object({
  promptSetId: z.number(),
  prompts: z
    .array(
      z.union([
        PromptSchema.sourceType().extend({
          signature: z.string().optional(),
          publicKey: z.string().optional(),
          signatureType: z.nativeEnum(SignatureTypes).optional(),
          keyType: z.nativeEnum(SignatureKeyTypes).optional(),
        }),
        // NonRevealedPromptSchema doesn't have a transform() method attached, that's why we don't have to use `.sourceType()` here
        NonRevealedPromptSchema.extend({
          signature: z.string().optional(),
          publicKey: z.string().optional(),
          signatureType: z.nativeEnum(SignatureTypes).optional(),
          keyType: z.nativeEnum(SignatureKeyTypes).optional(),

          // Since the object doesn't include the full Prompt data,
          // we need to also get the CID and SHA256 calculations of
          // the full Prompt object so we can mark this object as the
          // non-revealed version of the original Prompt.
          hashCIDRegistration: z.string(),
          hashSha256Registration: z.string(),
        }),
      ])
    )
    .min(1),
});

export const POST = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (_, ctx) => {
    await PromptService.insertPrompts(
      {
        prompts: ctx.body.prompts,
        promptSetId: ctx.body.promptSetId,
        uploaderId: ctx.userId,
      },
      { requestedByUserId: ctx.userId }
    );

    return NextResponse.json({
      message: "Prompts inserted successfully",
      success: true,
    });
  });

export type RequestBodyType = z.input<typeof bodySchema>;
export type ResponseType = {
  success: boolean;
  message?: string;
};
