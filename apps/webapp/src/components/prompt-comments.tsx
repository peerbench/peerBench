"use client";

import {
  SWR_GET_PROMPT_COMMENT_REPLIES,
  SWR_GET_PROMPT_COMMENTS,
} from "@/lib/swr/keys";
import { usePromptAPI } from "@/lib/hooks/use-prompt-api";
import { EntityComments, EntityCommentsConfig } from "@/components/entity-comments";

const MAX_COMMENTS_PER_PAGE = 5;

export interface PromptCommentsProps {
  promptId: string;
  variant?: "card" | "accordion";
  defaultOpen?: boolean;
}

export function PromptComments({ 
  promptId, 
  variant = "card",
  defaultOpen = false,
}: PromptCommentsProps) {
  const { getTopLevelComments, getReplies, postComment, postReply } =
    usePromptAPI();

  const config: EntityCommentsConfig = {
    getTopLevelComments,
    getReplies,
    postComment,
    postReply,
    swrKeyGenerator: (entityId: string, pageIndex: number) =>
      SWR_GET_PROMPT_COMMENTS(entityId, {
        page: pageIndex + 1,
        pageSize: MAX_COMMENTS_PER_PAGE,
      }),
    repliesSWRKeyGenerator: (id: string, commentId: number, params: any) =>
      SWR_GET_PROMPT_COMMENT_REPLIES(id, commentId, params),
    idField: "promptId",
    placeholder: "Share your thoughts about this prompt...",
  };

  return (
    <EntityComments
      entityId={promptId}
      config={config}
      variant={variant}
      defaultOpen={defaultOpen}
    />
  );
}
