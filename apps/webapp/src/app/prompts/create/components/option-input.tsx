"use client";

import { Button } from "@/components/ui/button";
import { usePageContext } from "../context";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { useEffect } from "react";

export interface OptionInputProps {
  optionKey: string;
  value: string;
  handleAnswerKeyChange: (key: string) => void;
  handleUpdateOptionClick: (key: string, value: string) => void;
  handleRemoveOptionClick: (key: string) => void;
}

export default function OptionInput({
  optionKey,
  value,
  handleAnswerKeyChange,
  handleUpdateOptionClick,
  handleRemoveOptionClick,
}: OptionInputProps) {
  const ctx = usePageContext();

  // Focus to the input when mounter
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.getElementById(`prompt-option-${optionKey}`)?.focus();
  }, [optionKey]);

  return (
    <div key={optionKey} className="flex items-center space-x-2">
      <Button
        onClick={() => handleAnswerKeyChange(optionKey)}
        disabled={ctx.isInProgress}
        size="icon"
        variant={ctx.prompt.answerKey === optionKey ? "default" : "outline"}
        className={`w-8 h-8 ${
          ctx.prompt.answerKey === optionKey
            ? "bg-green-500 hover:bg-green-600 text-white border-green-500 ring-2 ring-green-200"
            : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
        }`}
        title={
          ctx.prompt.answerKey === optionKey
            ? "Correct answer"
            : "Click to select as correct answer"
        }
      >
        {optionKey}
      </Button>
      <Input
        id={`prompt-option-${optionKey}`}
        type="text"
        value={value}
        onChange={(e) => handleUpdateOptionClick(optionKey, e.target.value)}
        disabled={ctx.isInProgress}
        inputClassName={cn("flex-1 !p-5", {
          "bg-green-500": ctx.prompt.answerKey === optionKey,
        })}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder={`Option ${optionKey}`}
      />
      <Button
        onClick={() => handleRemoveOptionClick(optionKey)}
        size="sm"
        variant="outline"
        disabled={ctx.isInProgress}
        className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ×
      </Button>
    </div>
  );
}
