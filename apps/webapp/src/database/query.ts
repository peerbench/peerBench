import { PaginationOptions } from "@/types/db";
import { MaybePromise } from "peerbench";
import { ColumnsSelection, SQL } from "drizzle-orm";
import { PgSelect } from "drizzle-orm/pg-core";
import {
  JoinNullability,
  SelectMode,
} from "drizzle-orm/query-builders/select.types";

// TODO: https://use-the-index-luke.com
/**
 * Generic method to paginate any query with count. `countQuery`
 * must have a `count` column in it.
 */
export async function paginateQuery<
  TTableName extends string,
  TCountTableName extends string,
  TSelect extends ColumnsSelection,
  TSelectMode extends SelectMode,
  TNullabilityMap extends Record<string, JoinNullability>,
  TOutputData = Awaited<
    PgSelect<TTableName, TSelect, TSelectMode, TNullabilityMap>
  >,
>(
  query: PgSelect<TTableName, TSelect, TSelectMode, TNullabilityMap>,
  countQuery: PgSelect<
    TCountTableName,
    { count: SQL<number> },
    "partial",
    Record<TCountTableName, "not-null">
  >,
  options?: PaginationOptions & {
    convertData?: (data: Awaited<typeof query>) => MaybePromise<TOutputData>;
  }
) {
  const page = (options?.page || 1) - 1;
  const limit = options?.pageSize || 0;
  const offset = page * limit;

  let paginatedQuery = query.$dynamic();

  if (offset > 0) {
    paginatedQuery = paginatedQuery.offset(offset) as typeof paginatedQuery;
  }

  if (limit > 0) {
    paginatedQuery = paginatedQuery.limit(limit) as typeof paginatedQuery;
  }

  const countQueryResult = await countQuery;
  const data = await paginatedQuery;

  return {
    data: (options?.convertData
      ? await options.convertData(data)
      : data) as TOutputData,
    totalCount: countQueryResult?.[0]?.count ?? 0,
  };
}

export type PaginatedQueryResult<T> = {
  data: T[];
  totalCount: number;
};
