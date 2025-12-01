import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { ProfileService } from "@/services/user-profile.service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ClientSideResponseType, NextResponseType } from "@/lib/utilities";
import { parsePathParams } from "@/lib/route-kit/middlewares/path-params";

export const PATCH = createHandler()
  .use(auth)
  .use(parsePathParams({ id: z.coerce.number() }))
  .handle(async (req, ctx) => {
    await ProfileService.readNotification({
      userId: ctx.userId,
      notificationId: ctx.id,
    });

    return NextResponse.json({ message: "Notification marked as read" });
  });

export type ResponseType = ClientSideResponseType<
  NextResponseType<typeof PATCH>
>;
