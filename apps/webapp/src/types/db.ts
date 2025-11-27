import { db } from "@/database/client";

/**
 * @deprecated Use `DbTx` instead
 */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbTx =
  | Parameters<Parameters<typeof db.transaction>[0]>[0]
  | typeof db;

export type DbOptions<TxIsRequired extends boolean = false> =
  TxIsRequired extends true
    ? {
        tx: DbTx;
      }
    : {
        tx?: DbTx;
      };

export type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};
