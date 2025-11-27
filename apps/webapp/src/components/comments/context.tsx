"use client";

import { PaginatedResponse } from "@/types/db";
import { createContext, useContext } from "react";

// Generic types for the Comments
export interface CommentData {
  id: number;
  userId: string;
  userDisplayName: string | null;
  content: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  replyCount: number;
  parentCommentId: number | null;
}

export interface CommentsFetcherParams {
  query: {
    page?: number;
    pageSize?: number;
  };
}

export interface CommentsFetcher<T extends CommentData> {
  (params: CommentsFetcherParams): Promise<PaginatedResponse<T>>;
}

export interface CommentsSWRKeyGenerator {
  (pageIndex: number): CommentsFetcherParams | null;
}

export interface CommentsContextValue<T extends CommentData> {
  // Data
  topLevelComments: T[];
  totalCount: number | undefined;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  isReachingEnd: boolean;

  // Actions
  loadMore: () => void;
  mutate: (data?: any, opts?: any) => void;

  // Error
  error: any;

  // Additional props for child components
  idField: string;
  idValue: string;
  getReplies: (id: string, commentId: number, params: any) => Promise<any>;
  postComment: (id: string, data: { content: string }) => Promise<void>;
  postReply: (
    id: string,
    commentId: number,
    data: { content: string }
  ) => Promise<void>;
  swrKeyGenerator: (id: string, commentId: number, params: any) => any;

  // Comment form state
  showCommentForm: boolean;
  setShowCommentForm: (show: boolean) => void;
}

const CommentsContext = createContext<CommentsContextValue<any> | null>(null);

export function useCommentsContext<
  T extends CommentData,
>(): CommentsContextValue<T> {
  const context = useContext(CommentsContext);
  if (!context) {
    throw new Error(
      "useCommentsContext must be used within a Comments component"
    );
  }
  return context;
}

export { CommentsContext };
