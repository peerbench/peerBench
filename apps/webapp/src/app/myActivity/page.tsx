import { getUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LucideThumbsUp,
  LucideThumbsDown,
  LucideFileText,
  LucideFolderOpen,
  LucideActivity,
  LucideMessageSquare,
} from "lucide-react";
import Link from "next/link";
import { ActivityService } from "@/services/activity.service";
import { DateTime } from "luxon";

export default async function MyActivityPage() {
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch all recent activities
  const [recentFeedbacks, recentPrompts, recentPromptSets, recentComments] =
    await Promise.all([
      ActivityService.getRecentFeedbacks({ userId: user.id, limit: 20 }),
      ActivityService.getRecentPrompts({ userId: user.id, limit: 20 }),
      ActivityService.getRecentPromptSets({ userId: user.id, limit: 20 }),
      ActivityService.getRecentComments({ userId: user.id, limit: 20 }),
    ]);

  const hasAnyActivity =
    recentFeedbacks.length > 0 ||
    recentPrompts.length > 0 ||
    recentPromptSets.length > 0 ||
    recentComments.length > 0;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <LucideActivity className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            My Activity
          </h1>
        </div>

        {/* Quick Navigation */}
        {hasAnyActivity && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Jump to Section</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {recentComments.length > 0 && (
                  <Link
                    href="#comments"
                    className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-md transition-colors text-sm font-medium"
                  >
                    Recent Comments ({recentComments.length})
                  </Link>
                )}
                {recentFeedbacks.length > 0 && (
                  <Link
                    href="#feedbacks"
                    className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md transition-colors text-sm font-medium"
                  >
                    Recent Feedbacks ({recentFeedbacks.length})
                  </Link>
                )}
                {recentPrompts.length > 0 && (
                  <Link
                    href="#prompts"
                    className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-md transition-colors text-sm font-medium"
                  >
                    Recent Prompts ({recentPrompts.length})
                  </Link>
                )}
                {recentPromptSets.length > 0 && (
                  <Link
                    href="#prompt-sets"
                    className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-md transition-colors text-sm font-medium"
                  >
                    Recent Benchmarks ({recentPromptSets.length})
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!hasAnyActivity && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 text-lg">
                No activity yet. Start by reviewing prompts or creating
                benchmarks!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Comments Section */}
        {recentComments.length > 0 && (
          <div id="comments" className="scroll-mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LucideMessageSquare className="w-5 h-5" />
                  Recent Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentComments.map((comment) => {
                    // Construct the appropriate link based on comment type
                    let href = "#";
                    if (comment.entityType === "prompt" && comment.promptId) {
                      href = `/prompts/${comment.promptId}#comment-${comment.id}`;
                    } else if (
                      comment.entityType === "response" &&
                      comment.promptId &&
                      comment.responseId
                    ) {
                      href = `/prompts/${comment.promptId}#response-${comment.responseId}`;
                    } else if (
                      comment.entityType === "score" &&
                      comment.promptId &&
                      comment.responseId
                    ) {
                      href = `/prompts/${comment.promptId}#response-${comment.responseId}`;
                    }

                    return (
                      <Link
                        key={`${comment.entityType}-${comment.id}`}
                        href={href}
                        className="block p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <LucideMessageSquare className="w-4 h-4 text-orange-600" />
                              <Badge variant="outline" className="text-xs">
                                {comment.entityType}
                              </Badge>
                            </div>
                            {comment.content && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                {comment.content}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {DateTime.fromJSDate(
                              comment.createdAt
                            ).toRelative()}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Feedbacks Section */}
        {recentFeedbacks.length > 0 && (
          <div id="feedbacks" className="scroll-mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LucideThumbsUp className="w-5 h-5" />
                  Recent Feedbacks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentFeedbacks.map((feedback) => {
                    // Construct the appropriate link based on feedback type
                    let href = "#";
                    if (feedback.entityType === "prompt" && feedback.promptId) {
                      href = `/prompts/${feedback.promptId}`;
                    } else if (
                      feedback.entityType === "response" &&
                      feedback.promptId &&
                      feedback.responseId
                    ) {
                      href = `/prompts/${feedback.promptId}#response-${feedback.responseId}`;
                    } else if (
                      feedback.entityType === "score" &&
                      feedback.promptId &&
                      feedback.responseId
                    ) {
                      href = `/prompts/${feedback.promptId}#response-${feedback.responseId}`;
                    }

                    return (
                      <Link
                        key={feedback.id}
                        href={href}
                        className="block p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {feedback.opinion === "positive" ? (
                                <LucideThumbsUp className="w-4 h-4 text-green-600" />
                              ) : (
                                <LucideThumbsDown className="w-4 h-4 text-red-600" />
                              )}
                              <Badge
                                variant={
                                  feedback.opinion === "positive"
                                    ? "default"
                                    : "destructive"
                                }
                                className="text-xs"
                              >
                                {feedback.opinion}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                on {feedback.entityType}
                              </span>
                            </div>
                            {feedback.promptQuestion && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                {feedback.promptQuestion}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {DateTime.fromJSDate(
                              feedback.createdAt
                            ).toRelative()}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Prompts Section */}
        {recentPrompts.length > 0 && (
          <div id="prompts" className="scroll-mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LucideFileText className="w-5 h-5" />
                  Recent Prompts Created
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentPrompts.map((prompt) => (
                    <Link
                      key={prompt.id}
                      href={`/prompts/${prompt.id}`}
                      className="block p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {prompt.type}
                            </Badge>
                            {prompt.promptSetTitle && (
                              <Badge variant="secondary" className="text-xs">
                                {prompt.promptSetTitle}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            {prompt.question}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {DateTime.fromJSDate(prompt.createdAt).toRelative()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Prompt Sets Section */}
        {recentPromptSets.length > 0 && (
          <div id="prompt-sets" className="scroll-mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LucideFolderOpen className="w-5 h-5" />
                  Recent Benchmarks Created
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentPromptSets.map((promptSet) => (
                    <Link
                      key={promptSet.id}
                      href={`/prompt-sets/view/${promptSet.id}`}
                      className="block p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                              {promptSet.title}
                            </h3>
                            {promptSet.isPublic && (
                              <Badge variant="secondary" className="text-xs">
                                Public
                              </Badge>
                            )}
                          </div>
                          {promptSet.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {promptSet.description}
                            </p>
                          )}
                          <div className="flex gap-3 mt-2 text-xs text-gray-500">
                            <span>{promptSet.promptCount} prompts</span>
                            {promptSet.category && (
                              <span>• {promptSet.category}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {DateTime.fromJSDate(
                            promptSet.createdAt
                          ).toRelative()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
