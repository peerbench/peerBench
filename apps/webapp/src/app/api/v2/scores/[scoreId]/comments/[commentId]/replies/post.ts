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
      scoreId: z.string().uuid(),
      commentId: z.coerce.number().int().positive(),
    })
  )
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    const commentId = await CommentService.insertScoreComment(
      {
        content: ctx.body.content,
        parentCommentId: ctx.commentId,
        scoreId: ctx.scoreId,
        userId: ctx.userId,
      },
      { requestedByUserId: ctx.userId }
    );

    return NextResponse.json({
      commentId,
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
