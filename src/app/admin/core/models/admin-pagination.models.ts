/**
 * Common pagination interfaces for CeylonGo Admin APIs.
 * Matches backend offset/limit and page/page_size pagination structures.
 */

export interface AdminPaginationParams {
  page?: number;
  limit?: number;
  page_size?: number;
}

export interface AdminPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
