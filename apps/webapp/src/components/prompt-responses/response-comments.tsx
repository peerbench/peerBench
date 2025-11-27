"use client";

import {
  SWR_GET_RESPONSE_COMMENTS,
  SWR_GET_RESPONSE_COMMENT_REPLIES,
} from "@/lib/swr/keys";
import { useResponsesAPI } from "@/lib/hooks/use-responses-api";
import { EntityComments, EntityCommentsConfig } from "@/components/entity-comments";

const MAX_COMMENTS_PER_PAGE = 5;

export interface ResponseCommentsProps {
  responseId: string;
}

export function ResponseComments({ responseId }: ResponseCommentsProps) {
  const { getTopLevelComments, getReplies, postComment, postReply } =
    useResponsesAPI();

  const config: EntityCommentsConfig = {
    getTopLevelComments,
    getReplies,
    postComment,
    postReply,
    swrKeyGenerator: (entityId: string, pageIndex: number) =>
      SWR_GET_RESPONSE_COMMENTS(entityId, {
        page: pageIndex + 1,
        pageSize: MAX_COMMENTS_PER_PAGE,
      }),
    repliesSWRKeyGenerator: (id: string, commentId: number, params: any) =>
      SWR_GET_RESPONSE_COMMENT_REPLIES(id, commentId, params),
    idField: "responseId",
    placeholder: "Share your thoughts about this response...",
  };

  return (
    <EntityComments
      entityId={responseId}
      config={config}
      variant="accordion"
      defaultOpen={false}
    />
  );
}
