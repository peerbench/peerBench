import { checkValidation } from "@/lib/route-helpers/check-validation";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { pathParams } from "@/lib/route-kit/middlewares/path-params";
import { PromptSetService } from "@/services/promptset.service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const DELETE = createHandler()
  .use(pathParams<{ id: string; coAuthorUserId: string }>())
  .use(auth)
  .handle(async (req, ctx) => {
    const id = checkValidation(
      z.coerce.number({ message: "Invalid ID" }).safeParse(ctx.id)
    );

    await PromptSetService.removeCoAuthor({
      promptSetId: id,
      coAuthorUserId: ctx.coAuthorUserId,
      requestedByUserId: ctx.userId,
    });

    return NextResponse.json({ message: "Co-author removed" });
  });

export type ResponseType = { message: string };
