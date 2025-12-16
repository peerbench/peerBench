import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUser } from "@/lib/actions/auth";
import { PromptSetService } from "@/services/promptset.service";
import {
  LucideUsers,
  LucideTag,
  LucideShield,
  LucideGlobe,
  LucidePen,
  LucideClipboardCheck,
  LucidePlus,
  LucidePlay,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PromptsInfiniteList from "@/components/prompts-infinite-list";
import { NULL_UUID } from "@/lib/constants";
import { DownloadPromptsButton } from "./components/download-prompts-button";
import { NotFound } from "./_not-found";
import { Suspense } from "react";
import { Leaderboard } from "./components/leaderboard";
import { ModelLeaderboardSkeleton } from "@/components/model-leaderboard/skeleton";
import { CollaboratorsTableSkeleton } from "@/components/collaborators-table/skeleton";
import { CollaboratorsAndContributors } from "./components/collaborators-and-contributors";
import { Stats } from "./components/stats";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  const promptSetId = await params.then((p) => parseInt(p.id));
  const promptSet = await PromptSetService.getPromptSet({
    filters: {
      id: promptSetId,
    },
    requestedByUserId: user?.id ?? NULL_UUID, // Still apply access control rules
  });

  if (!promptSet) {
    return <NotFound />;
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {promptSet.title}
                </h1>
                {promptSet.isPublic && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    <LucideGlobe className="h-3 w-3" />
                    Public
                  </Badge>
                )}
                <div className="flex-1" />
                <div className="flex gap-2">
                  {(promptSet.totalPromptsCount ?? 0) > 0 && Boolean(user) && (
                    <Button
                      asChild
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 h-auto"
                      size="lg"
                    >
                      <Link
                        href={`/prompts/review?promptSetId=${promptSet.id}`}
                      >
                        <LucideClipboardCheck size={20} className="mr-2" />
                        Review Prompts
                      </Link>
                    </Button>
                  )}
                  {promptSet.permissions?.canEdit && (
                    <Button
                      asChild
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Link
                        href={`/prompts/create?promptSetId=${promptSet.id}`}
                      >
                        <LucidePlus size={16} className="mr-1" />
                        Add Prompts
                      </Link>
                    </Button>
                  )}
                  {promptSet.permissions?.canEdit && (
                    <Button asChild variant="outline">
                      <Link href={`/benchmarks/view/${promptSet.id}/edit`}>
                        <LucidePen size={16} />
                        Edit
                      </Link>
                    </Button>
                  )}
                  {Boolean(user) && (
                    <Button
                      asChild
                      variant="outline"
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      <Link
                        href={`/benchmarks/run?promptSetId=${promptSet.id}`}
                      >
                        <LucidePlay size={16} />
                        Run Benchmark
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {promptSet.description && (
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {promptSet.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <LucideTag className="h-3 w-3" />
                  {promptSet.category || "Default"}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <LucideShield className="h-3 w-3" />
                  {promptSet.license || "CC BY 4.0"}
                </Badge>
                {promptSet.isPublicSubmissionsAllowed && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <LucideUsers className="h-3 w-3" />
                    Public Submissions
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Hero Footer */}
          <div className="border-t border-box-border mt-8 pt-4">
            {promptSet.tags && promptSet.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <p className="text-xs text-slate-600">Tags</p>
                {promptSet.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        {promptSet.citationInfo && (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>Citation Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {promptSet.citationInfo}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Statistics Cards */}
        <Stats
          overallAvgScore={promptSet.overallAvgScore}
          totalPromptCount={promptSet.totalPromptsCount}
          totalScoreCount={promptSet.totalScoreCount}
          totalContributors={promptSet.totalContributors}
          promptFeedbackStatusCounts={promptSet.promptFeedbackStatusCounts}
        />

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Model Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Suspense fallback={<ModelLeaderboardSkeleton />}>
              <Leaderboard
                promptSetId={promptSetId}
                totalPromptCount={promptSet.totalPromptsCount || 0}
                userId={user?.id}
              />
            </Suspense>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Collaborators & Contributors</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pl-0 pr-0">
            <Suspense fallback={<CollaboratorsTableSkeleton />}>
              <CollaboratorsAndContributors
                promptSetId={promptSetId}
                userId={user?.id}
              />
            </Suspense>
          </CardContent>
        </Card>

        {/* Download Button Section */}
        <div className="flex justify-end">
          <DownloadPromptsButton
            promptSetId={promptSet.id}
            promptSetTitle={promptSet.title}
            userId={user?.id}
          />
        </div>

        <PromptsInfiniteList fixedFilters={{ promptSetId: promptSet.id }} />
      </div>
    </main>
  );
}
