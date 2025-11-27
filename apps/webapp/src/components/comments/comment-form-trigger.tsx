"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { LucidePlus } from "lucide-react";
import { useCommentsContext } from "./context";
import { VariantProps } from "class-variance-authority";

export interface CommentFormTriggerProps {
  buttonText?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
}

export function CommentFormTrigger({
  buttonText = "Post Comment",
  variant = "outline",
  className = "text-xs",
}: CommentFormTriggerProps) {
  const { showCommentForm, setShowCommentForm } = useCommentsContext();

  const handleClick = () => {
    setShowCommentForm(!showCommentForm);
  };

  return (
    <Button variant={variant} onClick={handleClick} className={className}>
      <LucidePlus size={16} />
      <div>{buttonText}</div>
    </Button>
  );
}
