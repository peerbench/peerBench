import { SignatureKeyTypes, SignatureTypes } from "@/database/types";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { HashService } from "@/services/hash.service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const bodySchema = z.object({
  hashes: z.array(
    z.object({
      cid: z.string(),
      sha256: z.string(),
      signature: z.string().optional(),
      publicKey: z.string().optional(),
      signatureType: z.nativeEnum(SignatureTypes).optional(),
      keyType: z.nativeEnum(SignatureKeyTypes).optional(),
    })
  ),
});

export const POST = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    await HashService.insertHashes({
      hashes: ctx.body.hashes,
      uploaderId: ctx.userId,
    });

    return NextResponse.json({
      success: true,
      message: "Hashes inserted successfully",
    });
  });

export type RequestBodyType = z.input<typeof bodySchema>;
export type ResponseType = {
  success: boolean;
  message?: string;
};
