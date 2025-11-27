"use client";

import { useCallback } from "react";
import {
  Comments,
  CommentForm,
  Entries,
  CommentsFetcherParams,
  CommentFormTrigger,
  useCommentsContext,
} from "@/components/comments";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideMessageSquare } from "lucide-react";

export interface EntityCommentsConfig {
  // API methods
  getTopLevelComments: (
    entityId: string,
    query: any
  ) => Promise<any>;
  getReplies: (
    entityId: string,
    commentId: number,
    query: any
  ) => Promise<any>;
  postComment: (entityId: string, data: { content: string }) => Promise<any>;
  postReply: (
    entityId: string,
    commentId: number,
    data: { content: string }
  ) => Promise<any>;
  
  // SWR key generators
  swrKeyGenerator: (entityId: string, pageIndex: number) => any;
  repliesSWRKeyGenerator: (
    entityId: string,
    commentId: number,
    params: any
  ) => any;
  
  // Entity metadata
  idField: "promptId" | "responseId" | "scoreId";
  placeholder: string;
}

export interface EntityCommentsProps {
  entityId: string;
  config: EntityCommentsConfig;
  variant?: "card" | "accordion";
  defaultOpen?: boolean;
}

function AccordionView({ 
  defaultOpen, 
  placeholder,
  handleNewCommentAdded 
}: { 
  defaultOpen: boolean; 
  placeholder: string;
  handleNewCommentAdded: () => void;
}) {
  const { totalCount } = useCommentsContext();
  
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? "item-1" : undefined}
    >
      <AccordionItem value="item-1" className="bg-white/60 backdrop-blur-sm">
        <AccordionTrigger>
          <div className="pl-4 flex items-center gap-2">
            <LucideMessageSquare className="w-5 h-5 text-gray-600" />
            <div>Comments ({totalCount ?? 0})</div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="">
          <div className="flex justify-end px-4">
            <CommentFormTrigger
              buttonText="Post Comment"
              variant="outline"
            />
          </div>
          <div className="pt-3">
            <CommentForm
              onCommentAdded={handleNewCommentAdded}
              placeholder={placeholder}
              className="mb-6"
              showConditionally={true}
            />
            <Entries className="shadow-none rounded-none border-l-none border-r-none" />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function EntityComments({
  entityId,
  config,
  variant = "accordion",
  defaultOpen = false,
}: EntityCommentsProps) {
  const {
    getTopLevelComments,
    getReplies,
    postComment,
    postReply,
    swrKeyGenerator,
    repliesSWRKeyGenerator,
    idField,
    placeholder,
  } = config;

  const getSWRKey = useCallback(
    (pageIndex: number) => swrKeyGenerator(entityId, pageIndex),
    [swrKeyGenerator, entityId]
  );

  const getRepliesSWRKey = useCallback(
    (id: string, commentId: number, params: any) =>
      repliesSWRKeyGenerator(id, commentId, params),
    [repliesSWRKeyGenerator]
  );

  const fetcher = useCallback(
    (params: CommentsFetcherParams) =>
      getTopLevelComments(entityId, params.query),
    [getTopLevelComments, entityId]
  );

  const postCommentWrapper = useCallback(
    async (id: string, data: { content: string }) => {
      await postComment(id, data);
    },
    [postComment]
  );

  const postReplyWrapper = useCallback(
    async (id: string, commentId: number, data: { content: string }) => {
      await postReply(id, commentId, data);
    },
    [postReply]
  );

  const handleNewCommentAdded = () => {
    // This will be handled by the Comments component's mutate function
  };

  const commentsContent = (
    <Comments
      idField={idField}
      idValue={entityId}
      fetcher={fetcher}
      swrKeyGenerator={getSWRKey}
      getReplies={getReplies}
      postComment={postCommentWrapper}
      postReply={postReplyWrapper}
      repliesSWRKeyGenerator={getRepliesSWRKey}
    >
      {variant === "card" ? (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LucideMessageSquare className="w-5 h-5 text-gray-600" />
                <CardTitle>Comments</CardTitle>
              </div>
              <CommentFormTrigger buttonText="Post Comment" variant="outline" />
            </div>
          </CardHeader>
          <CardContent>
            <CommentForm
              onCommentAdded={handleNewCommentAdded}
              placeholder={placeholder}
              className="mb-6"
              showConditionally={true}
            />
            <Entries />
          </CardContent>
        </Card>
      ) : (
        <AccordionView 
          defaultOpen={defaultOpen}
          placeholder={placeholder}
          handleNewCommentAdded={handleNewCommentAdded}
        />
      )}
    </Comments>
  );

  return commentsContent;
}

