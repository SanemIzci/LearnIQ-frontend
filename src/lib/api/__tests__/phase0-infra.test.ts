import { beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '@/store';
import {
  clearAuth,
  SESSION_BOOTSTRAP_KEY,
  setCredentials,
  switchTenant,
} from '@/store/authSlice';
import {
  abortInFlightRefresh,
  apiClient,
  bootstrapAuthSession,
  logoutSession,
  registerSessionExpiredListener,
} from '@/lib/api/client';
import { normalizePaginatedResponse } from '@/lib/api/pagination';
import { queryClient, tenantQueryKey } from '@/lib/api/queryClient';
import { isValidTenantId } from '@/lib/utils';

describe('Phase 0 Core Infrastructure & Contract Layer', () => {
  beforeEach(() => {
    abortInFlightRefresh();
    registerSessionExpiredListener(null);
    window.sessionStorage.removeItem(SESSION_BOOTSTRAP_KEY);
    store.dispatch(clearAuth());
    queryClient.clear();
    vi.restoreAllMocks();
  });

  it('keeps accessToken strictly in-memory and never writes SUPER_ADMIN tokens to web storage', () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'tenant-access-jwt',
          refreshToken: 'tenant-refresh-jwt',
          role: 'ADMIN',
          userId: '11111111-1111-1111-1111-111111111111',
          username: 'admin_ankara',
        },
        tenantId: 'tenant_ankara',
      })
    );

    expect(store.getState().auth.accessToken).toBe('tenant-access-jwt');
    expect(window.localStorage?.getItem?.(SESSION_BOOTSTRAP_KEY) ?? null).toBeNull();
    const sessionRaw = window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEY) ?? '';
    expect(sessionRaw).toContain('tenant-refresh-jwt');
    expect(sessionRaw).not.toContain('tenant-access-jwt');

    // Switch to SUPER_ADMIN (refreshToken is null)
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'super-admin-jwt',
          refreshToken: null,
          role: 'SUPER_ADMIN',
          userId: '99999999-9999-9999-9999-999999999999',
          username: 'root',
        },
        tenantId: null,
      })
    );

    expect(store.getState().auth.accessToken).toBe('super-admin-jwt');
    expect(store.getState().auth.refreshToken).toBeNull();
    expect(store.getState().auth.tenantId).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEY)).toBeNull();
  });

  it('purges TanStack Query cache when switching tenants, switching users, or clearing auth', () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'jwt-1',
          refreshToken: 'refresh-1',
          role: 'TEACHER',
          userId: '22222222-2222-2222-2222-222222222222',
          username: 'teacher1',
        },
        tenantId: 'tenant_alpha',
      })
    );

    const alphaKey = tenantQueryKey('tenant_alpha', 'exams');
    queryClient.setQueryData(alphaKey, [{ id: 'exam-alpha' }]);
    expect(queryClient.getQueryData(alphaKey)).toEqual([{ id: 'exam-alpha' }]);

    // Switching tenant must purge cached tenant_alpha data via listener middleware
    store.dispatch(switchTenant('tenant_beta'));
    expect(queryClient.getQueryData(alphaKey)).toBeUndefined();

    // Switching user within same tenant must also purge cache
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'jwt-2',
          refreshToken: 'refresh-2',
          role: 'TEACHER',
          userId: '22222222-2222-2222-2222-222222222222',
          username: 'teacher1',
        },
        tenantId: 'tenant_beta',
      })
    );
    const betaKey = tenantQueryKey('tenant_beta', 'exams');
    queryClient.setQueryData(betaKey, [{ id: 'exam-beta' }]);

    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'jwt-3',
          refreshToken: 'refresh-3',
          role: 'STUDENT',
          userId: '77777777-7777-7777-7777-777777777777',
          username: 'student1',
        },
        tenantId: 'tenant_beta',
      })
    );
    expect(queryClient.getQueryData(betaKey)).toBeUndefined();
  });

  it('executes a single POST /api/v1/auth/refresh for concurrent 401 responses and retries all callers', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'expired-access-token',
          refreshToken: 'initial-refresh-token',
          role: 'TEACHER',
          userId: '33333333-3333-3333-3333-333333333333',
          username: 'teacher_izmir',
        },
        tenantId: 'tenant_izmir',
      })
    );

    let refreshCallCount = 0;

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      const headers = new Headers(init?.headers);

      if (url.endsWith('/api/v1/auth/refresh')) {
        refreshCallCount += 1;
        await new Promise((r) => setTimeout(r, 20));
        const body = JSON.parse(String(init?.body)) as {
          refreshToken: string;
          tenantId: string;
        };
        expect(body.refreshToken).toBe('initial-refresh-token');
        expect(body.tenantId).toBe('tenant_izmir');

        return new Response(
          JSON.stringify({
            accessToken: 'fresh-access-token',
            refreshToken: 'rotated-refresh-token',
            role: 'TEACHER',
            userId: '33333333-3333-3333-3333-333333333333',
            username: 'teacher_izmir',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      expect(headers.get('X-User-Role')).toBeNull();
      expect(headers.get('X-User-Id')).toBeNull();
      expect(headers.get('X-Tenant-Id')).toBe('tenant_izmir');

      if (headers.get('Authorization') === 'Bearer expired-access-token') {
        return new Response(
          JSON.stringify({ status: 401, error: 'UNAUTHORIZED', message: 'Token expired' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (headers.get('Authorization') === 'Bearer fresh-access-token') {
        return new Response(JSON.stringify({ ok: true, url }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(null, { status: 500 });
    });

    const [res1, res2, res3] = await Promise.all([
      apiClient.get<{ ok: boolean }>('/api/v1/exams', {
        headers: { 'X-User-Role': 'SUPER_ADMIN' },
      }),
      apiClient.get<{ ok: boolean }>('/api/v1/classrooms'),
      apiClient.get<{ ok: boolean }>('/api/v1/subjects'),
    ]);

    expect(refreshCallCount).toBe(1);
    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);
    expect(res3.ok).toBe(true);
    expect(store.getState().auth.accessToken).toBe('fresh-access-token');
    expect(store.getState().auth.refreshToken).toBe('rotated-refresh-token');
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it('prevents an in-flight refresh from resurrecting a session after logout (C-01)', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'expired-token',
          refreshToken: 'refresh-before-logout',
          role: 'ADMIN',
          userId: '44444444-4444-4444-4444-444444444444',
          username: 'admin_user',
        },
        tenantId: 'tenant_ankara',
      })
    );

    let resolveRefresh!: (res: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/v1/auth/refresh')) {
        return new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        });
      }
      if (url.endsWith('/api/v1/auth/logout')) {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'Logged out' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ status: 401, error: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const pendingRequest = apiClient.get('/api/v1/exams');
    await new Promise((r) => setTimeout(r, 10));

    // User logs out while refresh is still in flight
    await logoutSession();
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEY)).toBeNull();

    // Now the stale refresh response resolves
    resolveRefresh(
      new Response(
        JSON.stringify({
          accessToken: 'resurrected-access-token',
          refreshToken: 'resurrected-refresh-token',
          role: 'ADMIN',
          userId: '44444444-4444-4444-4444-444444444444',
          username: 'admin_user',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await expect(pendingRequest).rejects.toThrow();

    // Session and sessionStorage MUST remain cleared
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.accessToken).toBeNull();
    expect(store.getState().auth.tenantId).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEY)).toBeNull();
  });

  it('prevents an in-flight refresh from reverting tenantId after switchTenant (C-01)', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'expired-alpha-token',
          refreshToken: 'alpha-refresh-token',
          role: 'ADMIN',
          userId: '55555555-5555-5555-5555-555555555555',
          username: 'admin_alpha',
        },
        tenantId: 'tenant_alpha',
      })
    );

    let resolveRefresh!: (res: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/v1/auth/refresh')) {
        return new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        });
      }
      return Promise.resolve(
        new Response(JSON.stringify({ status: 401, error: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const pendingRequest = apiClient.get('/api/v1/exams');
    await new Promise((r) => setTimeout(r, 10));

    // Switch tenant while tenant_alpha refresh is in flight
    store.dispatch(switchTenant('tenant_beta'));
    expect(store.getState().auth.tenantId).toBe('tenant_beta');

    resolveRefresh(
      new Response(
        JSON.stringify({
          accessToken: 'alpha-new-token',
          refreshToken: 'alpha-new-refresh',
          role: 'ADMIN',
          userId: '55555555-5555-5555-5555-555555555555',
          username: 'admin_alpha',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await expect(pendingRequest).rejects.toThrow();

    expect(store.getState().auth.tenantId).toBe('tenant_beta');
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.accessToken).toBeNull();
  });

  it('invokes onSessionExpired only once when concurrent 401 requests fail refresh (N-06)', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'expired-token',
          refreshToken: 'revoked-refresh-token',
          role: 'STUDENT',
          userId: '66666666-6666-6666-6666-666666666666',
          username: 'student1',
        },
        tenantId: 'tenant_ankara',
      })
    );

    const expiredEvents: Array<{ wasSuperAdmin: boolean }> = [];
    registerSessionExpiredListener((ctx) => {
      expiredEvents.push(ctx);
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ status: 401, error: 'UNAUTHORIZED', message: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const results = await Promise.allSettled([
      apiClient.get('/api/v1/students/me/home'),
      apiClient.get('/api/v1/students/me/exams'),
      apiClient.get('/api/v1/students/me/badges'),
    ]);

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(expiredEvents).toEqual([{ wasSuperAdmin: false }]);
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });

  it('never calls /api/v1/auth/refresh when SUPER_ADMIN receives 401 and strips any X-Tenant-Id header (N-01)', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'super-admin-token',
          refreshToken: null,
          role: 'SUPER_ADMIN',
          userId: '99999999-9999-9999-9999-999999999999',
          username: 'root',
        },
        tenantId: null,
      })
    );

    let expiredContext: { wasSuperAdmin: boolean } | null = null;
    registerSessionExpiredListener((ctx) => {
      expiredContext = ctx;
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('X-Tenant-Id')).toBeNull();
      return new Response(
        JSON.stringify({ status: 401, error: 'UNAUTHORIZED', message: 'Expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    });

    await expect(
      apiClient.get('/api/v1/platform/admin/tenants', {
        tenantId: 'tenant_spoof',
        headers: { 'X-Tenant-Id': 'tenant_spoof' },
      })
    ).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(expiredContext).toEqual({ wasSuperAdmin: true });
  });

  it('strips both Authorization and X-Tenant-Id when skipAuth is true (N-02)', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'active-tenant-jwt',
          refreshToken: 'active-refresh',
          role: 'STUDENT',
          userId: '66666666-6666-6666-6666-666666666666',
          username: 'student1',
        },
        tenantId: 'tenant_ankara',
      })
    );

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBeNull();
      expect(headers.get('X-Tenant-Id')).toBeNull();
      return new Response(JSON.stringify({ netScore: 75.5 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const res = await apiClient.get<{ netScore: number }>('/api/v1/public/share/tenant_ankara.tok', {
      skipAuth: true,
      headers: { 'X-Tenant-Id': 'tenant_ankara' },
    });
    expect(res.netScore).toBe(75.5);
  });

  it('blocks sending credentials to arbitrary external URLs (N-04)', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(apiClient.get('https://malicious.example.com/exfiltrate')).rejects.toThrow(
      /Güvenilmeyen harici URL/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('revokes both old and rotated refresh tokens when logout receives 401 on an expired access token without mutating Redux state (N-03, D3)', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'expired-access-token',
          refreshToken: 'current-refresh-token',
          role: 'TEACHER',
          userId: '33333333-3333-3333-3333-333333333333',
          username: 'teacher1',
        },
        tenantId: 'tenant_ankara',
      })
    );

    const calls: Array<{ url: string; body: Record<string, string>; authHeader: string | null }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      const headers = new Headers(init?.headers);
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, string>) : {};
      calls.push({ url, body, authHeader: headers.get('Authorization') });

      // 1st call: /logout with expired accessToken -> Gateway returns 401
      if (url.endsWith('/api/v1/auth/logout') && headers.get('Authorization') === 'Bearer expired-access-token') {
        return new Response(JSON.stringify({ status: 401, error: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 2nd call: isolated /refresh revokes 'current-refresh-token' and returns rotated pair
      if (url.endsWith('/api/v1/auth/refresh')) {
        return new Response(
          JSON.stringify({
            accessToken: 'rotated-access-token',
            refreshToken: 'rotated-refresh-token',
            role: 'TEACHER',
            userId: '33333333-3333-3333-3333-333333333333',
            username: 'teacher1',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 3rd call: /logout with rotated-access-token revokes 'rotated-refresh-token'
      if (url.endsWith('/api/v1/auth/logout') && headers.get('Authorization') === 'Bearer rotated-access-token') {
        return new Response(JSON.stringify({ message: 'Logged out successfully' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(null, { status: 500 });
    });

    await logoutSession();

    expect(calls).toHaveLength(3);
    expect(calls[0].url).toContain('/api/v1/auth/logout');
    expect(calls[0].body).toEqual({ refreshToken: 'current-refresh-token' });
    expect(calls[1].url).toContain('/api/v1/auth/refresh');
    expect(calls[1].body).toEqual({ refreshToken: 'current-refresh-token', tenantId: 'tenant_ankara' });
    expect(calls[2].url).toContain('/api/v1/auth/logout');
    expect(calls[2].authHeader).toBe('Bearer rotated-access-token');
    expect(calls[2].body).toEqual({ refreshToken: 'rotated-refresh-token' });

    // Local state must remain completely cleared (never resurrected by rotated tokens)
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.accessToken).toBeNull();
    expect(store.getState().auth.refreshToken).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEY)).toBeNull();
  });

  it('preserves sessionStorage bootstrap on inline 401 refresh network_error and guards notifySessionExpiredOnce by sessionEpoch (D1, D2, D5, D6)', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'expired-jwt',
          refreshToken: 'valid-refresh-token',
          role: 'TEACHER',
          userId: '33333333-3333-3333-3333-333333333333',
          username: 'teacher1',
        },
        tenantId: 'tenant_ankara',
      })
    );

    const expiredNotifications: Array<{ wasSuperAdmin: boolean }> = [];
    registerSessionExpiredListener((ctx) => {
      expiredNotifications.push(ctx);
    });

    // D2: 401 on API request followed by transient network_error on /refresh must NOT wipe sessionStorage or fire onSessionExpired
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/v1/auth/refresh')) {
        throw new TypeError('Network offline');
      }
      return new Response(
        JSON.stringify({ status: 401, error: 'UNAUTHORIZED', message: 'Expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    });

    await expect(apiClient.get('/api/v1/exams')).rejects.toThrow();
    expect(store.getState().auth.refreshToken).toBe('valid-refresh-token');
    expect(window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEY)).toContain('valid-refresh-token');
    expect(expiredNotifications).toHaveLength(0);

    // D5: Invalid credentials payload is ignored safely without throwing in reducer
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'bad',
          refreshToken: 'bad',
          role: 'INVALID_ROLE' as never,
          userId: '1',
          username: 'u',
        },
        tenantId: 'tenant_ankara',
      })
    );
    expect(store.getState().auth.user?.role).toBe('TEACHER');

    // D6: Unauthenticated request with skipAuth=false still strips caller-supplied Authorization header
    store.dispatch(clearAuth());
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBeNull();
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await apiClient.get('/api/v1/public/ping', {
      headers: { Authorization: 'Bearer spoofed-caller-token' },
    });

    // D1: Stale 401 from an old sessionEpoch does not fire notifySessionExpiredOnce after a new session logs in
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'old-super-jwt',
          refreshToken: null,
          role: 'SUPER_ADMIN',
          userId: '99999999-9999-9999-9999-999999999999',
          username: 'root',
        },
        tenantId: null,
      })
    );

    let resolveStale401!: (res: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveStale401 = resolve;
        })
    );

    const staleReq = apiClient.get('/api/v1/platform/admin/tenants');
    // User logs into a new tenant session (advancing sessionEpoch) before stale 401 arrives
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'new-session-jwt',
          refreshToken: 'new-session-refresh',
          role: 'ADMIN',
          userId: '11111111-1111-1111-1111-111111111111',
          username: 'admin1',
        },
        tenantId: 'tenant_ankara',
      })
    );

    resolveStale401(
      new Response(JSON.stringify({ status: 401, error: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(staleReq).rejects.toThrow();
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.accessToken).toBe('new-session-jwt');
    expect(expiredNotifications).toHaveLength(0);
  });

  it('handles bootstrapAuthSession success, invalid refresh (401), malformed storage, and temporary network errors (N-09)', async () => {
    // 1. Malformed storage -> cleaned up and initialized
    window.sessionStorage.setItem(SESSION_BOOTSTRAP_KEY, '{not-valid-json');
    await bootstrapAuthSession();
    expect(store.getState().auth.isInitialized).toBe(true);
    expect(window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEY)).toBeNull();

    // 2. Temporary network error -> preserves sessionStorage bootstrap for next reload
    window.sessionStorage.setItem(
      SESSION_BOOTSTRAP_KEY,
      JSON.stringify({ refreshToken: 'valid-refresh', tenantId: 'tenant_ankara' })
    );
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const netOutcome = await bootstrapAuthSession();
    expect(netOutcome.status).toBe('network_error');
    expect(store.getState().auth.isInitialized).toBe(true);
    expect(window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEY)).not.toBeNull();

    // 3. Subsequent bootstrap succeeds and rotates refresh token
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: 'bootstrapped-access-jwt',
          refreshToken: 'rotated-bootstrap-refresh',
          role: 'ADMIN',
          userId: '11111111-1111-1111-1111-111111111111',
          username: 'admin_ankara',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const okOutcome = await bootstrapAuthSession();
    expect(okOutcome.status).toBe('ok');
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.accessToken).toBe('bootstrapped-access-jwt');
    expect(window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEY)).toContain(
      'rotated-bootstrap-refresh'
    );

    // 4. Invalid/revoked refresh token (401) -> wipes sessionStorage and clears auth
    store.dispatch(clearAuth());
    window.sessionStorage.setItem(
      SESSION_BOOTSTRAP_KEY,
      JSON.stringify({ refreshToken: 'revoked-refresh', tenantId: 'tenant_ankara' })
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 401 })
    );

    const invalidOutcome = await bootstrapAuthSession();
    expect(invalidOutcome.status).toBe('invalid_session');
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEY)).toBeNull();
  });

  it('matches backend TenantSchemaValidator boundary rules ^[a-z][a-z0-9_]{0,62}$ exactly (C-03)', () => {
    expect(isValidTenantId('a')).toBe(true);
    expect(isValidTenantId('tenant_ankara_01')).toBe(true);
    expect(isValidTenantId('a' + '0'.repeat(62))).toBe(true); // 63 chars max

    expect(isValidTenantId('a' + '0'.repeat(63))).toBe(false); // 64 chars rejected
    expect(isValidTenantId('Tenant_ankara')).toBe(false); // uppercase rejected
    expect(isValidTenantId('1tenant')).toBe(false); // leading digit rejected
    expect(isValidTenantId('_tenant')).toBe(false); // leading underscore rejected
    expect(isValidTenantId('tenant-ankara')).toBe(false); // hyphen rejected
    expect(isValidTenantId('')).toBe(false);
    expect(isValidTenantId(null)).toBe(false);
  });

  it('normalizes dual-mode pagination responses (raw array vs PageResponse envelope)', () => {
    const fromArray = normalizePaginatedResponse([{ id: '1' }, { id: '2' }]);
    expect(fromArray).toEqual({
      content: [{ id: '1' }, { id: '2' }],
      totalElements: 2,
      page: 0,
      size: 20,
      totalPages: 1,
    });

    const fromPage = normalizePaginatedResponse({
      content: [{ id: '1' }],
      totalElements: 45,
      page: 2,
      size: 10,
      totalPages: 5,
    });
    expect(fromPage.totalElements).toBe(45);
    expect(fromPage.page).toBe(2);
    expect(fromPage.totalPages).toBe(5);
  });
});
