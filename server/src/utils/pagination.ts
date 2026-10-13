export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Normalizes and validates page and limit parameters.
 * Enforces page >= 1 and 1 <= limit <= maxLimit (default 100).
 */
export function normalizePagination(
  rawPage?: unknown,
  rawLimit?: unknown,
  defaultLimit = 10,
  maxLimit = 100
): PaginationParams {
  const parsedPage = parseInt(String(rawPage || '1'), 10);
  const parsedLimit = parseInt(String(rawLimit || defaultLimit), 10);

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const clampedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, maxLimit)
    : defaultLimit;

  const skip = (page - 1) * clampedLimit;

  return {
    page,
    limit: clampedLimit,
    skip,
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}
