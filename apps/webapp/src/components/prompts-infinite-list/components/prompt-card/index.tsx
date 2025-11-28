"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { motion } from "motion/react";
import {
  LucideEye,
  LucideHash,
  LucideLoader2,
  LucidePlus,
  LucideTrash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { PromptItem } from "@/lib/hooks/use-prompt-api";
import { PromptStatuses } from "@/database/types";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMemo, useState } from "react";
import { usePromptSetAPI } from "@/lib/hooks/use-prompt-set-api";
import { useComponentContext } from "../../context";
import { toast } from "react-toastify";
import { errorMessage } from "@/utils/error-message";
import { MaybePromise } from "peerbench";
import { usePromptSearchFiltersContext } from "@/components/prompt-search-filters/context";
import IncludedByPromptSetLink from "@/components/included-by-prompt-set-link";
import { MarkdownTruncatedText } from "@/components/markdown-truncated-text";

export type PromptCardProps = PromptItem & {
  tags?: string[];
  className?: string;
  onIncludingPromptSetUpdated?: () => MaybePromise<void>;
};

const MAX_MODEL_COUNT = 5;

export function PromptCard({
  id,
  fullPrompt,
  isRevealed,
  includedInPromptSets,
  tags = [],
  responseAndScoreStats = [],
  className,
  onIncludingPromptSetUpdated,
}: PromptCardProps) {
  const [isExcludingPrompt, setIsExcludingPrompt] = useState(false);
  const [isReIncludingPrompt, setIsReIncludingPrompt] = useState(false);
  const promptFiltersCtx = usePromptSearchFiltersContext();
  const { isFilterFixed } = useComponentContext();
  const promptSetAPI = usePromptSetAPI();
  const filterPromptSetId = useMemo(
    () => promptFiltersCtx.filters.promptSetId?.value?.value.toString() ?? "",
    [promptFiltersCtx.filters.promptSetId?.value]
  );
  const fixedPromptSetIdFilter = useMemo(
    () => isFilterFixed("promptSetId"),
    [isFilterFixed]
  );
  const canExclude = useMemo(
    () =>
      includedInPromptSets.find((ps) => ps.id === parseInt(filterPromptSetId))
        ?.canExclude,
    [includedInPromptSets, filterPromptSetId]
  );
  const canReInclude = useMemo(
    () =>
      includedInPromptSets.find((ps) => ps.id === parseInt(filterPromptSetId))
        ?.canReInclude,
    [includedInPromptSets, filterPromptSetId]
  );
  const isWorking = useMemo(
    () => isExcludingPrompt || isReIncludingPrompt,
    [isExcludingPrompt, isReIncludingPrompt]
  );

  const handleOnExcludePromptClick = async () => {
    if (isWorking) return;

    setIsExcludingPrompt(true);
    try {
      await promptSetAPI.updatePromptAssignment(
        parseInt(filterPromptSetId),
        id,
        {
          status: PromptStatuses.excluded,
        }
      );
      await onIncludingPromptSetUpdated?.();
      toast.success(`Prompt excluded`);
    } catch (err) {
      console.error(err);
      toast.error(`Operation failed: ${errorMessage(err)}`);
    } finally {
      setIsExcludingPrompt(false);
    }
  };

  const handleOnReIncludePromptClick = async () => {
    if (isWorking) return;

    setIsReIncludingPrompt(true);
    try {
      await promptSetAPI.updatePromptAssignment(
        parseInt(filterPromptSetId),
        id,
        {
          status: PromptStatuses.included,
        }
      );
      await onIncludingPromptSetUpdated?.();
      toast.success(`Done`);
    } catch (err) {
      console.error(err);
      toast.error(`Operation failed: ${errorMessage(err)}`);
    } finally {
      setIsReIncludingPrompt(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "w-full border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200",
          className
        )}
      >
        <div className="p-4 flex flex-col w-full space-y-4">
          <div className="flex justify-between w-full">
            <h3 className="text-xs text-gray-500 flex gap-2 flex-wrap">
              {includedInPromptSets.slice(0, 5).map((promptSet, i) => (
                <div className="flex items-end" key={promptSet.id}>
                  {promptSet.promptStatus !== PromptStatuses.included ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <IncludedByPromptSetLink
                          key={promptSet.id}
                          promptSetId={promptSet.id}
                          promptSetTitle={promptSet.title}
                          promptStatus={promptSet.promptStatus}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        The Prompt is excluded from this Benchmark
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <IncludedByPromptSetLink
                      key={promptSet.id}
                      promptSetId={promptSet.id}
                      promptSetTitle={promptSet.title}
                      promptStatus={promptSet.promptStatus}
                    />
                  )}
                  {i !== Math.min(includedInPromptSets.length, 5) - 1 && ", "}
                </div>
              ))}
              {includedInPromptSets.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{includedInPromptSets.length - 5} more
                </Badge>
              )}
            </h3>
            <CopyButton
              className="text-muted-foreground hover:text-gray-700"
              text={id}
              variant="ghost"
            >
              <div className="flex items-center">
                <LucideHash size={16} />
                <span className="font-mono ml-2 mr-1 text-[14px]">{id}</span>
              </div>
            </CopyButton>
          </div>

          <div className="w-full overflow-hidden line-clamp-2 text-sm flex flex-col gap-3">
            {isRevealed ? (
              <MarkdownTruncatedText text={fullPrompt || ""} maxLength={250} />
            ) : (
              <p className="text-gray-600 italic p-3 border rounded-lg bg-gray-50 border-gray-200">
                Prompt is not revealed yet
              </p>
            )}
          </div>

          <div className="flex items-start justify-between">
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs w-fit h-fit px-3 py-1 rounded-full"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            {responseAndScoreStats.length > 0 ? (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">
                    Sent to:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[...responseAndScoreStats]
                      // TODO: This should be done on the database query level
                      .sort((a, b) =>
                        a.avgScore === null
                          ? 1
                          : b.avgScore === null
                            ? -1
                            : (b.avgScore ?? 0) - (a.avgScore ?? 0)
                      )
                      .slice(0, MAX_MODEL_COUNT)
                      .map((stat, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                          style={{
                            backgroundColor: getBadgeColor(stat.avgScore),
                            borderColor: getBadgeColor(stat.avgScore),
                          }}
                        >
                          {stat.modelId}{" "}
                          {stat.avgScore !== null
                            ? `(${stat.avgScore.toFixed(2)})`
                            : ""}
                        </Badge>
                      ))}
                    {responseAndScoreStats.length > MAX_MODEL_COUNT && (
                      <Badge variant="outline" className="text-xs">
                        +{responseAndScoreStats.length - MAX_MODEL_COUNT} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1" />
            )}
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link
                  href={`/prompts/${id}${fixedPromptSetIdFilter && filterPromptSetId ? `?fromPromptSet=${filterPromptSetId}` : ""}`}
                >
                  <LucideEye className="w-3 h-3" />
                  Inspect
                </Link>
              </Button>

              {fixedPromptSetIdFilter && canExclude && (
                <Tooltip delayDuration={800}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-500"
                      onClick={handleOnExcludePromptClick}
                      disabled={isWorking}
                    >
                      {isExcludingPrompt ? (
                        <LucideLoader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <LucideTrash className="w-3 h-3" />
                      )}
                      Exclude
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Exclude this Prompt from the Benchmark
                  </TooltipContent>
                </Tooltip>
              )}

              {fixedPromptSetIdFilter && canReInclude && (
                <Tooltip delayDuration={800}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-green-600 hover:text-green-500"
                      onClick={handleOnReIncludePromptClick}
                      disabled={isWorking}
                    >
                      {isReIncludingPrompt ? (
                        <LucideLoader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <LucidePlus className="w-3 h-3" />
                      )}
                      Re-Include
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Re-Include this Prompt in the Benchmark
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// Helper function to get badge color based on score
function getBadgeColor(score: number | null) {
  if (score === null) return "hsl(1, 1, 1)";
  // Score range: 0-1, where 0 is red and 1 is green
  const hue = score * 120; // 0 = red (0°), 1 = green (120°)
  return `hsl(${hue}, 60%, 90%)`; // Light colors with good saturation and brightness
}
