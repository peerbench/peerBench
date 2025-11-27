import { checkValidation } from "@/lib/route-helpers/check-validation";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { pathParams } from "@/lib/route-kit/middlewares/path-params";
import { PromptSetService } from "@/services/promptset.service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const DELETE = createHandler()
  .use(auth)
  .use(pathParams<{ id: string }>())
  .handle(async (req, ctx) => {
    const id = checkValidation(
      z.coerce.number({ message: "Invalid ID" }).safeParse(ctx.id)
    );

    await PromptSetService.deletePromptSet({
      filters: { id },
      requestedByUserId: ctx.userId,
    });
    return NextResponse.json({ message: "Benchmark deleted" });
  });

export type ResponseType = { message: string };
