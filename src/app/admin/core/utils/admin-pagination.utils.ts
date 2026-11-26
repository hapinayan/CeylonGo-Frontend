/**
 * Pagination calculation and normalization utilities for CeylonGo Admin modules.
 */

export interface NormalizedPagination {
  page: number;
  pageSize: number;
  offset: number;
  totalPages: number;
}

export function calculateTotalPages(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 1;
  return Math.ceil(total / pageSize);
}

export function normalizePagination(
  page: number | undefined,
  pageSize: number | undefined,
  total = 0,
  defaultPageSize = 20
): NormalizedPagination {
  const safePage = Math.max(1, Math.floor(page || 1));
  const safePageSize = Math.max(1, Math.min(100, Math.floor(pageSize || defaultPageSize)));
  const totalPages = calculateTotalPages(total, safePageSize);
  const boundedPage = total > 0 ? Math.min(safePage, totalPages) : safePage;
  const offset = (boundedPage - 1) * safePageSize;

  return {
    page: boundedPage,
    pageSize: safePageSize,
    offset,
    totalPages,
  };
}
