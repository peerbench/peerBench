import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { parsePathParams } from "@/lib/route-kit/middlewares/path-params";
import { CommentService } from "@/services/comment.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  content: z.string(),
});

export const POST = createHandler()
  .use(auth)
  .use(
    parsePathParams({
      id: z.string().uuid(),
      commentId: z.coerce.number().int().positive(),
    })
  )
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    const commentId = await CommentService.insertPromptComment(
      {
        content: ctx.body.content,
        parentCommentId: ctx.commentId,
        promptId: ctx.id,
        userId: ctx.userId,
      },
      { requestedByUserId: ctx.userId }
    );

    return NextResponse.json({
      commentId: commentId,
      message: "Reply inserted successfully",
      success: true,
    });
  });

export type RequestBodyType = z.input<typeof bodySchema>;
export type ResponseType = {
  commentId: number;
  success: boolean;
  message?: string;
};
