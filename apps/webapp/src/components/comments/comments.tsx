"use client";

import { ReactNode, useState } from "react";
import { useInfiniteAPI } from "@/lib/hooks/use-infinite-api";
import {
  CommentData,
  CommentsFetcher,
  CommentsSWRKeyGenerator,
  CommentsContextValue,
  CommentsContext,
  CommentsFetcherParams,
} from "./context";

export interface CommentsProps<TData extends CommentData> {
  idField: string;
  idValue: string;
  fetcher: CommentsFetcher<TData>;
  swrKeyGenerator: CommentsSWRKeyGenerator;
  getReplies: (id: string, commentId: number, params: any) => Promise<any>;
  postComment: (id: string, data: { content: string }) => Promise<void>;
  postReply: (
    id: string,
    commentId: number,
    data: { content: string }
  ) => Promise<void>;
  repliesSWRKeyGenerator: (id: string, commentId: number, params: any) => any;
  children: ReactNode;
}

export function Comments<TData extends CommentData>({
  idField,
  idValue,
  fetcher,
  swrKeyGenerator,
  getReplies,
  postComment,
  postReply,
  repliesSWRKeyGenerator,
  children,
}: CommentsProps<TData>) {
  const [showCommentForm, setShowCommentForm] = useState(false);

  const {
    data: topLevelComments,
    totalCount,
    error,
    isLoading,
    isLoadingMore,
    isReachingEnd,
    loadMore,
    mutate,
  } = useInfiniteAPI<TData, CommentsFetcherParams>({
    getKey: swrKeyGenerator,
    fetcher,
    autoLoadNextPage: false,
    enableInfiniteScroll: false,
    swrConfig: {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  });

  const contextValue: CommentsContextValue<TData> = {
    topLevelComments: topLevelComments as TData[],
    totalCount,
    isLoading,
    isLoadingMore,
    isReachingEnd,
    loadMore,
    mutate,
    error,
    idField,
    idValue,
    getReplies,
    postComment,
    postReply,
    swrKeyGenerator: repliesSWRKeyGenerator,
    showCommentForm,
    setShowCommentForm,
  };

  return (
    <CommentsContext.Provider value={contextValue}>
      {children}
    </CommentsContext.Provider>
  );
}
