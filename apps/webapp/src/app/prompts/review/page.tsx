"use server";

import { getUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Suspense } from "react";
import { PromptTypes } from "peerbench";
import { StringBool } from "@/validation/string-bool";
import Sections from "./components/sections";
import SectionsSkeleton from "./components/sections/skeleton";
import Filters from "./components/filters";
import { PromptSearchFiltersContextProvider } from "@/components/prompt-search-filters/context";
import PromptSetSelectFilter from "@/components/prompt-search-filters/components/prompt-set-select-filter";
import { PromptSetService } from "@/services/promptset.service";
import { convertToQueryParams } from "@/utils/client/convert-to-query-params";
import { ProfileService } from "@/services/user-profile.service";
import { LucideBookOpen } from "lucide-react";

// Prompt Set ID if the user doesn't have any joined Prompt Set yet
const DEFAULT_PROMPT_SET_ID = 0;

// NOTE: Maybe the GET /prompts Zod schema can be directly used here.
const searchParamsSchema = z.object({
  promptSetId: z.coerce.number().optional().catch(undefined),
  tags: z
    .union([z.array(z.string()), z.string().transform((val) => [val])])
    .optional()
    .catch([]),
  type: z
    .union([
      z.array(z.nativeEnum(PromptTypes)),
      z.nativeEnum(PromptTypes).transform((val) => [val]),
    ])
    .optional()
    .catch([]),
  uploaderId: z.string().uuid().optional().catch(undefined),
  reviewedByUserId: z.string().uuid().optional().catch(undefined),
  excludeReviewed: StringBool().optional().catch(undefined),
  onlyReviewed: StringBool().optional().catch(undefined),
  minAvgScore: z.coerce.number().optional().catch(undefined),
  maxAvgScore: z.coerce.number().optional().catch(undefined),
  minScoreCount: z.coerce.number().optional().catch(undefined),
  maxScoreCount: z.coerce.number().optional().catch(undefined),
  minBadScoreCount: z.coerce.number().optional().catch(undefined),
  maxBadScoreCount: z.coerce.number().optional().catch(undefined),
  minGoodScoreCount: z.coerce.number().optional().catch(undefined),
  maxGoodScoreCount: z.coerce.number().optional().catch(undefined),
  badScoreThreshold: z.coerce.number().optional().catch(undefined),
  goodScoreThreshold: z.coerce.number().optional().catch(undefined),
  minReviewsCount: z.coerce.number().optional().catch(undefined),
  maxReviewsCount: z.coerce.number().optional().catch(undefined),
  minPositiveReviewsCount: z.coerce.number().optional().catch(undefined),
  maxPositiveReviewsCount: z.coerce.number().optional().catch(undefined),
  minNegativeReviewsCount: z.coerce.number().optional().catch(undefined),
  maxNegativeReviewsCount: z.coerce.number().optional().catch(undefined),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export default async function Page(props: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const searchParamsValidation = searchParamsSchema.safeParse(
    await props.searchParams
  );

  if (!searchParamsValidation.success) {
    redirect("/prompts/review");
  }

  const searchParams = searchParamsValidation.data;
  let urlParams = "";
  let requiresRedirect = false;

  // Fetch uploader profile if uploaderId is set
  let uploaderProfile = null;
  if (searchParams.uploaderId) {
    uploaderProfile = await ProfileService.getUserProfile({
      userId: searchParams.uploaderId,
    });
  }

  // If user is not specified a Prompt Set filter, we can set one
  // UNLESS they specified an uploader filter (for reviewing a specific user's uploads)
  if (searchParams.promptSetId === undefined && searchParams.uploaderId === undefined) {
    const recentPromptSet = await PromptSetService.getRecentJoinedPromptSet({
      userId: user.id,
    });

    // No filter provided so use the recent joined Prompt Set as the filter
    if (recentPromptSet) {
      searchParams.promptSetId = recentPromptSet.id;
    } else {
      // No recent joined Prompt Set so use the default Prompt Set as the filter
      searchParams.promptSetId = DEFAULT_PROMPT_SET_ID;
    }

    requiresRedirect = true;
  }

  // If there are missing params because they
  // couldn't pass the validation, remove them from the URL.
  if (
    Object.values(searchParams).filter((v) => v !== undefined).length !==
    Object.keys(await props.searchParams).length
  ) {
    urlParams = convertToQueryParams(
      searchParams,
      (key, value) => value !== undefined
    );
    requiresRedirect = true;
  }

  if (requiresRedirect) {
    redirect(`/prompts/review?${urlParams}`);
  }

  return (
    <PromptSearchFiltersContextProvider>
      <main className="max-w-7xl mx-auto px-4 py-8 mb-[200px] space-y-5">
        <div className="flex items-center gap-3">
          <LucideBookOpen className="h-8 w-8 text-gray-700" />
          <div className="flex items-center gap-2">
            <div className="text-gray-600 text-sm">
              Reviewing:
            </div>
            {searchParams.uploaderId ? (
              <div className="text-gray-900 font-medium">
                {uploaderProfile?.displayName || "User"}&apos;s uploaded prompts
              </div>
            ) : (
              <>
                <PromptSetSelectFilter
                  showIcon={false}
                  showLabel={false}
                  className="w-[300px] opacity-60 hover:opacity-100 transition-opacity"
                />
                <div className="text-gray-600 text-sm">
                  prompts
                </div>
              </>
            )}
          </div>
        </div>

        <Filters />
        <Suspense key={Date.now()} fallback={<SectionsSkeleton />}>
          <Sections filters={searchParams} userId={user.id} />
        </Suspense>
      </main>
    </PromptSearchFiltersContextProvider>
  );
}
