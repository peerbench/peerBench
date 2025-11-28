"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideHash, LucideSquareArrowOutUpRight } from "lucide-react";
import { PromptTypes } from "peerbench";
import { cn } from "@/utils/cn";
import type { GetPromptsReturnItem } from "@/services/prompt.service";
import Link from "next/link";

export interface PromptSectionProps {
  prompt: GetPromptsReturnItem;
}

export default function PromptSection({ prompt }: PromptSectionProps) {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between text-sm font-normal text-gray-500">
            <div className="flex items-center gap-3">
              <Link
                target="_blank"
                href={`/prompts/${prompt.id}`}
                className="hover:text-gray-700 transition-colors duration-200 hover:underline flex items-start gap-2"
              >
                <div className="flex items-center gap-1">
                  <LucideHash size={16} />
                  {prompt.id}
                </div>
                <LucideSquareArrowOutUpRight size={10} />
              </Link>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={cn("grid gap-3 ", {
              "grid-cols-1": prompt.type === PromptTypes.MultipleChoice,
              "grid-cols-2": prompt.type !== PromptTypes.MultipleChoice,
            })}
          >
            <div className="col-span-1">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                Prompt
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="whitespace-pre-wrap text-gray-800 text-sm">
                  {prompt.fullPrompt}
                </p>
              </div>
            </div>

            <div className="col-span-1">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                {prompt.type === PromptTypes.MultipleChoice
                  ? "Correct Answer"
                  : "Expected Answer"}
              </h3>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {prompt.type === PromptTypes.MultipleChoice
                    ? `${prompt.answerKey}: ${prompt.answer}`
                    : prompt.answer}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
