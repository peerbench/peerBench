"use client";

import { useState } from "react";
import AssignPromptModal, {
  AssignPromptModalSelectedPromptSet,
} from "./assign-prompt-modal";
import { Button } from "@/components/ui/button";
import { LucideHand } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { updatePromptAssignment } from "./actions/update-prompt-assignment";

export interface AssignButtonProps {
  promptId: string;
}

export function AssignButton({ promptId }: AssignButtonProps) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const handleAssignPromptClick = () => {
    setIsAssignModalOpen(true);
  };

  const handleAssignPromptModalSubmit = async (
    promptSet: AssignPromptModalSelectedPromptSet
  ) => {
    await updatePromptAssignment(promptId, promptSet.id);
    setIsAssignModalOpen(false);
  };

  const handleAssignPromptModalOpenChange = (open: boolean) => {
    setIsAssignModalOpen(open);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-fit text-xs text-gray-500"
            onClick={handleAssignPromptClick}
          >
            <LucideHand className="w-3 h-3" /> Assign to a Benchmark
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Assign this Prompt to a Benchmark that
            <br />
            you are allowed to submit Prompts
          </p>
        </TooltipContent>
      </Tooltip>

      <AssignPromptModal
        open={isAssignModalOpen}
        onSubmit={handleAssignPromptModalSubmit}
        promptId={promptId}
        onOpenChange={handleAssignPromptModalOpenChange}
      />
    </>
  );
}
