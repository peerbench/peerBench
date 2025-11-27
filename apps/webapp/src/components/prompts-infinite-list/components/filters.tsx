"use client";

import PromptSearchFilters from "@/components/prompt-search-filters";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LucideFunnel, LucideLoader2, LucideRotateCcw } from "lucide-react";
import { usePromptSearchFiltersContext } from "@/components/prompt-search-filters/context";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "./search";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { usePromptSetAPI } from "@/lib/hooks/use-prompt-set-api";
import { PromptSetLicenses } from "@/database/types";
import { toast } from "react-toastify";
import { errorMessage } from "@/utils/error-message";
import { useAuth } from "@/components/providers/auth";
import { useComponentContext } from "../context";
import Link from "next/link";

export function Filters() {
  const { isAnyFilterApplied, clearFilters, filters } =
    usePromptSearchFiltersContext();
  const { convertFiltersToApiParams } = useComponentContext();
  const promptSetAPI = usePromptSetAPI();
  const user = useAuth();
  const [isCreatingBenchmark, setIsCreatingBenchmark] = useState(false);

  const handleCreateBenchmarkClick = async () => {
    setIsCreatingBenchmark(true);
    const name = `Curated Benchmark ${Date.now()}`;
    const apiFilters = convertFiltersToApiParams(filters);

    promptSetAPI
      .createPromptSet({
        title: name,
        description: `This is a curated Benchmark. It includes the Prompts that matched with the following filters:\n\n${JSON.stringify(apiFilters, null, 2)}`,
        license: PromptSetLicenses.ccBy40,
        isPublic: false,
        isPublicSubmissionsAllowed: false,
        promptsToInclude: apiFilters,
      })
      .then((res) => {
        toast.success(
          <div className="flex flex-col gap-2">
            <p>
              Benchmark <span className="font-bold">{res.title}</span> created
              successfully
            </p>
            <Link
              className="underline text-gray-600 hover:text-gray-800 transition-colors duration-200"
              href={`/prompt-sets/view/${res.id}`}
            >
              View Benchmark
            </Link>
          </div>
        );
      })
      .catch((err) => {
        console.error(err);
        toast.error(`Failed to create Benchmark: ${errorMessage(err)}`);
      })
      .finally(() => setIsCreatingBenchmark(false));
  };

  const handleClearFiltersClick = () => {
    clearFilters();
  };

  return (
    <Card className="space-y-4 mb-8 w-full">
      <CardContent className="flex flex-col gap-4 py-5">
        <Search />
        <div className="space-y-4">
          <Accordion
            type="single"
            collapsible
            defaultValue={isAnyFilterApplied ? "filters" : undefined}
          >
            <AccordionItem value="filters" className="group border-none">
              <AccordionTrigger className="pb-5">
                <div className="flex items-center gap-2">
                  <LucideFunnel size={16} />
                  Filters
                </div>
              </AccordionTrigger>
              <AccordionContent
                forceMount
                className="group-data-[state=closed]:hidden border-t border-t-gray-200 pt-5 px-2"
              >
                <PromptSearchFilters clearAllButton={false} />
                <div className="w-full flex justify-end gap-2 mt-6">
                  {isAnyFilterApplied && (
                    <>
                      {Boolean(user) && (
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={handleCreateBenchmarkClick}
                              disabled={isCreatingBenchmark}
                            >
                              {isCreatingBenchmark && (
                                <LucideLoader2 className="w-3 h-3 animate-spin" />
                              )}
                              Create Benchmark
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Creates a new Benchmark that includes <br />
                              the Prompts that match with the given filters.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      <Button
                        variant="outline"
                        onClick={handleClearFiltersClick}
                      >
                        <LucideRotateCcw size={16} />
                        Clear Filters
                      </Button>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
