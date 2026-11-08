import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './error-parser';

/**
 * Shared TanStack Query v5 client configured for multi-tenant isolation.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          // Never auto-retry client/auth/conflict errors
          if ([400, 401, 403, 404, 409].includes(error.status)) {
            return false;
          }
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Builds a tenant-isolated TanStack Query key.
 * Including `{ tenantScope }` at index 0 guarantees that switching tenants
 * never reads stale cache entries from another tenant schema.
 */
export function tenantQueryKey<T extends readonly unknown[]>(
  tenantId: string | null | undefined,
  ...keyParts: T
): readonly [{ readonly tenantScope: string }, ...T] {
  return [{ tenantScope: tenantId ?? '__platform__' }, ...keyParts] as const;
}

/**
 * Immediately cancels in-flight queries and removes all cached data when
 * switching tenants or logging out to prevent cross-tenant data leakage.
 */
export function purgeTenantQueryCache(): void {
  void queryClient.cancelQueries();
  queryClient.clear();
}

