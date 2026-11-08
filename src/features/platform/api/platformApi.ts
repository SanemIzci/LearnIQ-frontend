import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { tenantQueryKey } from '@/lib/api/queryClient';
import type {
  CreateGlobalUserRequest,
  CreateTenantRequest,
  CreateTenantResponse,
  GlobalUserListResponse,
  GlobalUserSummary,
  SubscriptionUpdateRequest,
  TenantDetail,
  TenantListResponse,
  TenantSubscriptionStatus,
  TenantSummary,
} from '@/types/api';

export interface TenantsQueryParams {
  search?: string;
  status?: TenantSubscriptionStatus;
  page?: number;
  size?: number;
}

export interface GlobalUsersQueryParams {
  search?: string;
  page?: number;
  size?: number;
}

export const platformApi = {
  fetchTenants: async (params: TenantsQueryParams = {}): Promise<TenantListResponse> => {
    const { search, status, page = 0, size = 20 } = params;
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('size', String(size));
    if (search?.trim()) query.set('search', search.trim());
    if (status?.trim()) query.set('status', status.trim());

    return apiClient.get<TenantListResponse>(`/api/v1/platform/admin/tenants?${query.toString()}`);
  },

  fetchTenantDetail: async (id: string): Promise<TenantDetail> => {
    return apiClient.get<TenantDetail>(`/api/v1/platform/admin/tenants/${encodeURIComponent(id)}`);
  },

  provisionTenant: async (data: CreateTenantRequest): Promise<CreateTenantResponse> => {
    return apiClient.post<CreateTenantResponse>('/api/v1/platform/admin/tenants', data);
  },

  updateSubscription: async (
    id: string,
    status: TenantSubscriptionStatus
  ): Promise<TenantSummary> => {
    const payload: SubscriptionUpdateRequest = { status };
    return apiClient.patch<TenantSummary>(
      `/api/v1/platform/admin/tenants/${encodeURIComponent(id)}/subscription`,
      payload
    );
  },

  fetchGlobalUsers: async (params: GlobalUsersQueryParams = {}): Promise<GlobalUserListResponse> => {
    const { search, page = 0, size = 20 } = params;
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('size', String(size));
    if (search?.trim()) query.set('search', search.trim());

    return apiClient.get<GlobalUserListResponse>(
      `/api/v1/platform/admin/global-users?${query.toString()}`
    );
  },

  createGlobalUser: async (data: CreateGlobalUserRequest): Promise<GlobalUserSummary> => {
    return apiClient.post<GlobalUserSummary>('/api/v1/platform/admin/global-users', data);
  },

  resetGlobalUserPassword: async (id: string, newPassword: string): Promise<{ reset: boolean }> => {
    return apiClient.post<{ reset: boolean }>(
      `/api/v1/platform/admin/global-users/${encodeURIComponent(id)}/reset-password`,
      { newPassword }
    );
  },
};

export function useTenantsQuery(params: TenantsQueryParams = {}) {
  return useQuery({
    queryKey: tenantQueryKey(null, 'tenants', params),
    queryFn: () => platformApi.fetchTenants(params),
  });
}

export function useTenantDetailQuery(id: string | null) {
  return useQuery({
    queryKey: tenantQueryKey(null, 'tenants', id),
    queryFn: () => (id ? platformApi.fetchTenantDetail(id) : Promise.reject(new Error('No tenant ID'))),
    enabled: Boolean(id),
  });
}

export function useGlobalUsersQuery(params: GlobalUsersQueryParams = {}) {
  return useQuery({
    queryKey: tenantQueryKey(null, 'global-users', params),
    queryFn: () => platformApi.fetchGlobalUsers(params),
  });
}

