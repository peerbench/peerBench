"use client";

import { Button } from "@/components/ui/button";
import { usePageContext } from "../context";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { useEffect } from "react";
import { X } from "lucide-react";

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
  const isCorrect = ctx.prompt.answerKey === optionKey;

  // Focus to the input when mounter
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.getElementById(`prompt-option-${optionKey}`)?.focus();
  }, [optionKey]);

  return (
    <div key={optionKey} className="flex items-center gap-3">
      <Button
        onClick={() => handleAnswerKeyChange(optionKey)}
        disabled={ctx.isInProgress}
        size="icon"
        variant={isCorrect ? "default" : "outline"}
        className={cn(
          "w-11 h-11 shrink-0 text-base font-semibold",
          isCorrect ? "bg-green-500 hover:bg-green-600 text-white border-green-500 ring-2 ring-green-200"
            : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
        )}
        title={isCorrect ? "Correct answer" : "Click to mark as correct"}
      >
        {optionKey}
      </Button>
      <Input
        id={`prompt-option-${optionKey}`}
        type="text"
        value={value}
        onChange={(e) => handleUpdateOptionClick(optionKey, e.target.value)}
        disabled={ctx.isInProgress}
        className={cn(
          "flex-1 h-full text-base",
          isCorrect && "border-green-500/50 bg-green-50"
        )}
        placeholder={`Option ${optionKey}`}
      />
      <Button
        onClick={() => handleRemoveOptionClick(optionKey)}
        size="icon"
        variant="ghost"
        disabled={ctx.isInProgress}
        className="w-11 h-11 shrink-0 text-muted-foreground hover:text-destructive"
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
}
