import { ApiError } from "@/errors/api-error";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import {
  ProfileService,
  UserProfileUpdate,
} from "@/services/user-profile.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z
  .object({
    displayName: z.string().nullable().optional(),
    github: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    bluesky: z.string().nullable().optional(),
    mastodon: z.string().nullable().optional(),
    twitter: z.string().nullable().optional(),
  })
  .transform((value) => {
    // Empty string = the value won't be there anymore, aka null
    if (value.displayName !== undefined && value.displayName?.trim() === "") {
      value.displayName = null;
    }
    if (value.github !== undefined && value.github?.trim() === "") {
      value.github = null;
    }
    if (value.website !== undefined && value.website?.trim() === "") {
      value.website = null;
    }
    if (value.bluesky !== undefined && value.bluesky?.trim() === "") {
      value.bluesky = null;
    }
    if (value.mastodon !== undefined && value.mastodon?.trim() === "") {
      value.mastodon = null;
    }
    if (value.twitter !== undefined && value.twitter?.trim() === "") {
      value.twitter = null;
    }
    return value;
  });

export const PATCH = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    const body = ctx.body;

    // Check if any of the fields were provided
    const hasData = Object.keys(body).some(
      (key) => body[key as keyof typeof body] !== undefined
    );

    if (!hasData) {
      throw ApiError.badRequest("No data to update");
    }

    return NextResponse.json(
      await ProfileService.updateUserProfile(body, { userId: ctx.userId })
    );
  });

export type RequestBodyParams = z.input<typeof bodySchema>;
export type ResponseType = UserProfileUpdate;
