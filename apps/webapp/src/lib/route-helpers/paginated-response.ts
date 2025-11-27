import { PaginatedQueryResult } from "@/database/query";

/**
 * Converts a paginated query result into a response object
 * that can be returned from an API handler.
 */
export function paginatedResponse<T>(
  result: PaginatedQueryResult<T>,
  page: number,
  pageSize: number
) {
  const totalPages = Math.ceil(result.totalCount / pageSize);

  return {
    data: result.data,
    pagination: {
      page: page,
      pageSize: pageSize,
      totalCount: result.totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
