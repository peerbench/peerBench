"use client";

import {
  SWR_GET_SCORE_COMMENT_REPLIES,
  SWR_GET_SCORE_COMMENTS,
} from "@/lib/swr/keys";
import { useScoreAPI } from "@/lib/hooks/use-score-api";
import { EntityComments, EntityCommentsConfig } from "@/components/entity-comments";

const MAX_COMMENTS_PER_PAGE = 5;

export interface ScoreCommentsProps {
  scoreId: string;
}

export function ScoreComments({ scoreId }: ScoreCommentsProps) {
  const { getTopLevelComments, getReplies, postComment, postReply } =
    useScoreAPI();

  const config: EntityCommentsConfig = {
    getTopLevelComments,
    getReplies,
    postComment,
    postReply,
    swrKeyGenerator: (entityId: string, pageIndex: number) =>
      SWR_GET_SCORE_COMMENTS(entityId, {
        page: pageIndex + 1,
        pageSize: MAX_COMMENTS_PER_PAGE,
      }),
    repliesSWRKeyGenerator: (id: string, commentId: number, params: any) =>
      SWR_GET_SCORE_COMMENT_REPLIES(id, commentId, params),
    idField: "scoreId",
    placeholder: "Share your thoughts about this score...",
  };

  return (
    <EntityComments
      entityId={scoreId}
      config={config}
      variant="accordion"
      defaultOpen={false}
    />
  );
}
