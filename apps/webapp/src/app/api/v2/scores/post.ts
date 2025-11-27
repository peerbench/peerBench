import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { PromptScoreSchema } from "peerbench";
import { SignatureKeyTypes, SignatureTypes } from "@/database/types";
import { PromptScoreService } from "@/services/prompt-score.service";

export const bodySchema = z.object({
  scores: z
    .array(
      PromptScoreSchema.extend({
        responseHashSha256Registration: z.string(),
        responseHashCIDRegistration: z.string(),
        promptHashSha256Registration: z.string(),
        promptHashCIDRegistration: z.string(),
        scorerUserId: z.string().optional(),
        signature: z.string().optional(),
        publicKey: z.string().optional(),
        signatureType: z.nativeEnum(SignatureTypes).optional(),
        keyType: z.nativeEnum(SignatureKeyTypes).optional(),
      })
    )
    .min(1),
});

export const POST = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    await PromptScoreService.insertPromptScores(
      {
        scores: ctx.body.scores,
        uploaderId: ctx.userId,
      },
      { requestedByUserId: ctx.userId }
    );

    return NextResponse.json({
      success: true,
      message: "Scores inserted successfully",
    });
  });

export type RequestBodyType = z.infer<typeof bodySchema>;
export type ResponseType = {
  success: boolean;
  message?: string;
};
