import { ProfileService } from "@/services/user-profile.service";
import { OrganizationService } from "@/services/organization.service";
import { isUserAffiliatedWithOrg } from "@/services/org-people.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateTime } from "luxon";
import {
  LucideMail,
  LucideCalendar,
  LucideUser,
  LucideGlobe,
  LucideFileText,
  LucideUsers,
  LucideUpload,
  LucideWand2,
  LucideCheckCircle,
  LucideTrendingUp,
  LucideInfo,
  LucideHash,
  LucideMessageSquare,
  LucideThumbsUp,
} from "lucide-react";
import {
  SiX,
  SiBluesky,
  SiGithub,
  SiMastodon,
} from "@icons-pack/react-simple-icons";
import Link from "next/link";
import { cn } from "@/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CopyButton } from "@/components/copy-button";
import { OrgAffiliationCard } from "./org-affiliation-card";
import { Button } from "@/components/ui/button";

export interface ProfileProps {
  publicProfile?: boolean;
  userId: string;
}

export default async function Profile({ userId, publicProfile }: ProfileProps) {
  const profile = await ProfileService.getUserProfile({
    userId,
    stats: true,
  });

  if (!profile) {
    throw new Error("Profile information not found. Please try again later.");
  }

  // Get count of prompts with 3+ positive feedbacks
  const promptsWithThreePlusFeedbacks =
    await ProfileService.getPromptsWithThreePlusFeedbacks({ userId });

  // Lookup organization by email
  let organization = null;
  let isAffiliated = false;

  if (profile.email) {
    try {
      const orgLookupResult = await OrganizationService.lookupByEmail(
        profile.email
      );
      if (orgLookupResult.found && orgLookupResult.organization) {
        organization = orgLookupResult.organization;

        // Check if user is affiliated
        const affiliationResult = await isUserAffiliatedWithOrg({
          orgId: organization.id,
          userId: userId,
        });
        if (affiliationResult.success) {
          isAffiliated = affiliationResult.isAffiliated || false;
        }
      }
    } catch (error) {
      console.error("Error looking up organization:", error);
    }
  }

  const socialLinks = [
    { name: "GitHub", url: profile.github, icon: SiGithub },
    { name: "Website", url: profile.website, icon: LucideGlobe },
    { name: "X", url: profile.twitter, icon: SiX },
    { name: "Bluesky", url: profile.bluesky, icon: SiBluesky },
    { name: "Mastodon", url: profile.mastodon, icon: SiMastodon },
  ].filter((link) => link.url); // Only include the ones that user has set

  const contributionActivity = [];
  const performanceMetrics = [];

  // Contribution Activity
  if (profile.stats!.promptQuickFeedbackCount) {
    contributionActivity.push({
      title: "Feedback on Prompts",
      value: profile.stats!.promptQuickFeedbackCount,
      icon: LucideCheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      tooltip: "Total Feedback count that user has given on Prompts",
    });
  }

  if (profile.stats!.totalCommentCount) {
    contributionActivity.push({
      title: "Comments",
      value: profile.stats!.totalCommentCount,
      icon: LucideMessageSquare,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      tooltip:
        "Total Comment count that user has made on Prompts, Responses, and Scores",
    });
  }

  if (profile.stats!.promptSetQuickFeedbackCount) {
    contributionActivity.push({
      title: "Feedback on Benchmarks",
      value: profile.stats!.promptSetQuickFeedbackCount,
      icon: LucideFileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      tooltip: "Total Feedback count that user has given on Benchmarks",
    });
  }

  if (profile.stats!.createdPromptSetCount) {
    contributionActivity.push({
      title: "Benchmarks Created",
      value: profile.stats!.createdPromptSetCount,
      icon: LucideWand2,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      tooltip: "Total Benchmark count that were created by the user",
    });
  }

  if (profile.stats!.coCreatedPromptSetCount) {
    contributionActivity.push({
      title: "Co-Created Sets",
      value: profile.stats!.coCreatedPromptSetCount,
      icon: LucideUsers,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      tooltip: "Total Benchmark count that user has a role in them",
    });
  }

  if (profile.stats!.uploadedPromptCount) {
    contributionActivity.push({
      title: "Prompts Uploaded",
      value: profile.stats!.uploadedPromptCount,
      icon: LucideUpload,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      tooltip: "Total Prompt count that user had uploaded",
    });

    // Add verification percentage if there are uploaded prompts
    const verificationPercentage =
      profile.stats!.uploadedPromptCount > 0
        ? Math.round(
            (promptsWithThreePlusFeedbacks / profile.stats!.uploadedPromptCount) * 100
          )
        : 0;

    contributionActivity.push({
      title: "% Prompts Verified",
      value: `${verificationPercentage}%`,
      icon: LucideCheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      tooltip: "Percentage of uploaded prompts with 3+ positive feedbacks",
    });
  }

  if (profile.stats!.generatedPromptCount) {
    contributionActivity.push({
      title: "Prompts Generated",
      value: profile.stats!.generatedPromptCount,
      icon: LucideWand2,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
      tooltip:
        'Total Prompt count that user had generated using "Create Prompt" tool',
    });
  }

  if (profile.stats!.verifiedPromptCount) {
    contributionActivity.push({
      title: "Prompts Verified",
      value: profile.stats!.verifiedPromptCount,
      icon: LucideCheckCircle,
      color: "text-teal-600",
      bgColor: "bg-teal-100",
      tooltip:
        "Total Prompt count that have been verified (status = 'included')",
    });
  }

  // Performance Metrics
  if (profile.stats!.avgPromptQuickFeedbackConsensus) {
    performanceMetrics.push({
      title: "Prompt Feedback Consensus",
      value: `${(profile.stats!.avgPromptQuickFeedbackConsensus * 100).toFixed(1)}%`,
      icon: LucideTrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
      tooltip:
        "Average consensus of other users with the user in Prompt feedbacks (they had the same opinion)",
    });
  }

  if (profile.stats!.avgScoreCreatedPromptSets) {
    performanceMetrics.push({
      title: "Avg Score (Created)",
      value: Number(profile.stats!.avgScoreCreatedPromptSets).toFixed(2),
      icon: LucideTrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      tooltip:
        "Average score of the Scores of the Prompts from the Benchmarks created by the user",
    });
  }

  if (profile.stats!.avgScoreCoAuthoredPromptSets) {
    performanceMetrics.push({
      title: "Avg Score (Co-Authored)",
      value: Number(profile.stats!.avgScoreCoAuthoredPromptSets).toFixed(2),
      icon: LucideTrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      tooltip:
        "Average score of the Scores of the Prompts from the Benchmarks that user has a role in them",
    });
  }

  return (
    <>
      {/* Review Link Banner */}
      {profile.stats!.uploadedPromptCount && profile.stats!.uploadedPromptCount > 0 && (
        <div className="mb-6">
          <Card className="shadow-sm border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LucideThumbsUp className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900">
                      Get Your Prompts Reviewed
                    </h3>
                    <p className="text-xs text-blue-700">
                      Share this link with friends to get feedback on your prompts
                    </p>
                  </div>
                </div>
                <Link href={`/prompts/review?uploaderId=${userId}`}>
                  <Button variant="outline" size="sm" className="bg-white hover:bg-blue-100">
                    Review My Prompts
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-8">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border bg-primary">
                  {profile.displayName ? (
                    profile.displayName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  ) : (
                    <LucideUser size={32} />
                  )}
                </div>

                <div className="flex-1">
                  <h1 className="text-lg font-semibold text-gray-700 mb-2">
                    {profile.displayName || "[Name not available]"}
                  </h1>
                  <div className="flex flex-col gap-2">
                    {!publicProfile && profile.email && (
                      <div className="text-sm flex items-center gap-2 text-gray-500">
                        <LucideMail className="w-4 h-4" />
                        <CopyButton
                          iconSize={12}
                          className="hover:text-gray-600 gap-3"
                          text={profile.email}
                        >
                          {profile.email}
                        </CopyButton>
                      </div>
                    )}
                    <div className="text-sm flex items-center gap-2 text-gray-500">
                      <LucideHash className="w-4 h-4" />
                      <CopyButton
                        iconSize={12}
                        className="hover:text-gray-600 gap-3"
                        text={profile.id}
                      >
                        {profile.id}
                      </CopyButton>
                    </div>
                    <div className="text-sm flex items-center gap-2 text-gray-500">
                      <LucideCalendar className="w-4 h-4" />
                      Joined{" "}
                      {DateTime.fromJSDate(profile.createdAt).toFormat(
                        "TTT, DD"
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-3 border-t border-t-gray-100 pt-3">
                  {socialLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.name}
                        href={link.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg transition-colors hover:opacity-80 bg-gray-100 text-gray-600 hover:bg-gray-200"
                        title={link.name}
                      >
                        <Icon className="w-5 h-5" />
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Organization Affiliation */}
              {organization && isAffiliated && (
                <div className="border-t border-t-gray-100 pt-3">
                  <OrgAffiliationCard organization={organization} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contribution Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {contributionActivity.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {contributionActivity.map((act, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger>
                          <LucideInfo className="w-4 h-4" />
                        </TooltipTrigger>
                        <TooltipContent>{act.tooltip}</TooltipContent>
                      </Tooltip>
                      <span className="text-sm font-medium">{act.title}</span>
                    </div>
                    <Badge className={cn(act.bgColor, act.color)}>
                      {act.value}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="italic text-gray-400">No data found</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {performanceMetrics.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {performanceMetrics.map((metric, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger>
                          <LucideInfo className="w-4 h-4" />
                        </TooltipTrigger>
                        <TooltipContent>{metric.tooltip}</TooltipContent>
                      </Tooltip>
                      <span className="flex text-sm font-medium">
                        {metric.title}
                      </span>
                    </div>
                    <Badge className={cn(metric.bgColor, metric.color)}>
                      {metric.value}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="italic text-gray-400">No data found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
