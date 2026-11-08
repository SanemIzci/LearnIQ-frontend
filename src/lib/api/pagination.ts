import type { DualModeListResponse, PageResponse } from '@/types/api';

/**
 * Normalizes backend endpoints that return either a raw JSON array `T[]`
 * (when `page`/`size` query params are omitted) or a `PageResponse<T>` envelope
 * (when `page`/`size` query params are provided).
 */
export function normalizePaginatedResponse<T>(
  response: DualModeListResponse<T> | null | undefined,
  fallbackPage = 0,
  fallbackSize = 20
): PageResponse<T> {
  if (!response) {
    return {
      content: [],
      totalElements: 0,
      page: fallbackPage,
      size: fallbackSize,
      totalPages: 0,
    };
  }

  if (Array.isArray(response)) {
    const totalElements = response.length;
    const size = Math.max(fallbackSize, totalElements || 1);
    return {
      content: response,
      totalElements,
      page: 0,
      size,
      totalPages: totalElements > 0 ? 1 : 0,
    };
  }

  const content = Array.isArray(response.content) ? response.content : [];
  const totalElements =
    typeof response.totalElements === 'number' ? response.totalElements : content.length;
  const page = typeof response.page === 'number' ? response.page : fallbackPage;
  const size = typeof response.size === 'number' && response.size > 0 ? response.size : fallbackSize;
  const totalPages =
    typeof response.totalPages === 'number'
      ? response.totalPages
      : size > 0
        ? Math.ceil(totalElements / size)
        : 0;

  return {
    content,
    totalElements,
    page,
    size,
    totalPages,
  };
}

