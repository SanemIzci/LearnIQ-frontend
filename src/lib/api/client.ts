import { registerAbortRefreshCallback, store } from '@/store';
import {
  clearAuth,
  hydrateFromSessionBootstrap,
  isValidCredentialsPayload,
  markAuthInitialized,
  readSessionBootstrap,
  setCredentials,
  writeSessionBootstrap,
} from '@/store/authSlice';
import type { AuthResponse } from '@/types/api';
import { isValidTenantId } from '@/lib/utils';
import { ApiError, parseErrorResponse } from './error-parser';

/**
 * Resolves the API Gateway base URL using Vite's environment variable convention.
 */
export const API_BASE_URL: string =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.VITE_API_BASE_URL === 'string' &&
    import.meta.env.VITE_API_BASE_URL.trim() !== ''
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : 'http://localhost:8080'
  ).replace(/\/+$/, '');

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /**
   * Optional explicit tenant override (e.g. during tenant login before store is populated).
   */
  tenantId?: string | null;
  /**
   * Skip Authorization and X-Tenant-Id headers and 401 refresh handling
   * (e.g. public share endpoint GET /api/v1/public/share/{token}).
   */
  skipAuth?: boolean;
  /**
   * Skip 401 token refresh while still sending current Authorization/X-Tenant-Id
   * (e.g. POST /api/v1/auth/logout so an expired access token does not rotate a new refresh token).
   */
  skipRefreshOn401?: boolean;
  /**
   * Internal flag preventing infinite 401 retry loops.
   */
  _retried?: boolean;
}

type SessionExpiredListener = (context: { wasSuperAdmin: boolean }) => void;
let onSessionExpired: SessionExpiredListener | null = null;
let lastNotifiedExpiredEpoch: number | null = null;

export function registerSessionExpiredListener(listener: SessionExpiredListener | null): void {
  onSessionExpired = listener;
  lastNotifiedExpiredEpoch = null;
}

function notifySessionExpiredOnce(epoch: number, wasSuperAdmin: boolean): void {
  if (lastNotifiedExpiredEpoch === epoch) {
    return;
  }
  lastNotifiedExpiredEpoch = epoch;
  onSessionExpired?.({ wasSuperAdmin });
}

export type RefreshOutcome =
  | { status: 'ok'; accessToken: string }
  | { status: 'invalid_session' }
  | { status: 'network_error' }
  | { status: 'aborted' };

/**
 * Module-level Single-Flight Refresh Mutex and AbortController.
 * When multiple concurrent requests receive 401 simultaneously, only the first
 * initiates POST /api/v1/auth/refresh; all others await the same Promise.
 */
let refreshPromise: Promise<RefreshOutcome> | null = null;
let refreshAbortController: AbortController | null = null;

export function abortInFlightRefresh(): void {
  if (refreshAbortController) {
    refreshAbortController.abort();
    refreshAbortController = null;
  }
  refreshPromise = null;
}

registerAbortRefreshCallback(abortInFlightRefresh);

async function executeRefreshToken(
  refreshToken: string,
  tenantId: string,
  expectedEpoch: number,
  signal: AbortSignal
): Promise<RefreshOutcome> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Tenant-Id': tenantId,
      },
      body: JSON.stringify({ refreshToken, tenantId }),
      signal,
    });

    // Guard against logout or tenant switch that happened while refresh was in flight (C-01)
    const currentAuth = store.getState().auth;
    if (
      signal.aborted ||
      currentAuth.sessionEpoch !== expectedEpoch ||
      currentAuth.tenantId !== tenantId
    ) {
      return { status: 'aborted' };
    }

    if (!response.ok) {
      if (response.status >= 500) {
        return { status: 'network_error' };
      }
      return { status: 'invalid_session' };
    }

    const authResponse = (await response.json()) as AuthResponse;
    // Validate full payload at API boundary before dispatching (D5); tenant refresh can never return SUPER_ADMIN
    if (
      !authResponse ||
      authResponse.role === 'SUPER_ADMIN' ||
      !isValidCredentialsPayload({ auth: authResponse, tenantId })
    ) {
      return { status: 'invalid_session' };
    }

    // Re-check epoch after reading JSON body before mutating store
    const latestAuth = store.getState().auth;
    if (
      signal.aborted ||
      latestAuth.sessionEpoch !== expectedEpoch ||
      latestAuth.tenantId !== tenantId
    ) {
      return { status: 'aborted' };
    }

    store.dispatch(
      setCredentials({
        auth: authResponse,
        tenantId,
      })
    );

    return { status: 'ok', accessToken: authResponse.accessToken };
  } catch (err) {
    if (signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
      return { status: 'aborted' };
    }
    return { status: 'network_error' };
  }
}

export async function refreshAccessTokenSingleFlight(): Promise<RefreshOutcome> {
  const { auth } = store.getState();

  // SUPER_ADMIN sessions never have a refresh token; never call /api/v1/auth/refresh
  if (
    auth.user?.role === 'SUPER_ADMIN' ||
    !auth.refreshToken ||
    !isValidTenantId(auth.tenantId)
  ) {
    return { status: 'invalid_session' };
  }

  if (!refreshPromise) {
    const currentRefreshToken = auth.refreshToken;
    const currentTenantId = auth.tenantId;
    const currentEpoch = auth.sessionEpoch;
    const controller = new AbortController();
    refreshAbortController = controller;

    refreshPromise = executeRefreshToken(
      currentRefreshToken,
      currentTenantId,
      currentEpoch,
      controller.signal
    ).finally(() => {
      if (refreshAbortController === controller) {
        refreshAbortController = null;
        refreshPromise = null;
      }
    });
  }

  return refreshPromise;
}

/**
 * Bootstraps an existing tab session on reload if a tenant refreshToken is present
 * in sessionStorage while the in-memory accessToken is empty.
 * Distinguishes invalid/expired refresh tokens (clears auth) from transient network
 * errors (preserves sessionStorage bootstrap so retry/reload can recover).
 */
export async function bootstrapAuthSession(): Promise<RefreshOutcome | { status: 'noop' }> {
  const storedBootstrap = readSessionBootstrap();
  const currentAuth = store.getState().auth;

  if (!currentAuth.accessToken && storedBootstrap && !currentAuth.refreshToken) {
    store.dispatch(hydrateFromSessionBootstrap(storedBootstrap));
  } else if (!currentAuth.accessToken && !storedBootstrap) {
    // Handle corrupted or missing sessionStorage cleanly
    writeSessionBootstrap(null);
    store.dispatch(markAuthInitialized());
    return { status: 'noop' };
  }

  const { auth } = store.getState();
  if (auth.accessToken || !auth.refreshToken || !isValidTenantId(auth.tenantId)) {
    store.dispatch(markAuthInitialized());
    return { status: 'noop' };
  }

  const outcome = await refreshAccessTokenSingleFlight();
  if (outcome.status === 'invalid_session') {
    store.dispatch(clearAuth());
  } else if (outcome.status === 'network_error') {
    // Preserve sessionStorage bootstrap on temporary network outage
    store.dispatch(markAuthInitialized());
  }
  return outcome;
}

/**
 * Safely logs out the current session and revokes the server-side refresh token.
 * - Immediately clears local auth state, sessionStorage, and aborts in-flight refreshes.
 * - If accessToken is valid, calls POST /api/v1/auth/logout directly.
 * - If accessToken is missing or already expired (401 from Gateway), performs a one-time
 *   isolated POST /api/v1/auth/refresh (which revokes the old refresh token in DB) and immediately
 *   calls POST /api/v1/auth/logout with the newly rotated token pair so zero active refresh tokens
 *   remain in PostgreSQL (D3), without mutating client Redux state.
 */
export async function logoutSession(): Promise<void> {
  const { auth } = store.getState();
  const wasSuperAdmin = auth.user?.role === 'SUPER_ADMIN';
  const accessToken = auth.accessToken;
  const refreshToken = auth.refreshToken;
  const tenantId = auth.tenantId;

  // Immediately abort any in-flight token refresh and wipe local state synchronously
  abortInFlightRefresh();
  store.dispatch(clearAuth());

  if (wasSuperAdmin || !refreshToken || !isValidTenantId(tenantId)) {
    return;
  }

  const sendLogoutRequest = async (bearerToken: string, tokenToRevoke: string): Promise<Response> =>
    fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${bearerToken}`,
        'X-Tenant-Id': tenantId,
      },
      body: JSON.stringify({ refreshToken: tokenToRevoke }),
    });

  try {
    if (accessToken) {
      const logoutResp = await sendLogoutRequest(accessToken, refreshToken);
      if (logoutResp.status !== 401) {
        return;
      }
    }

    // Access token was missing or expired (401 at Gateway): rotate once to revoke old token,
    // then immediately revoke the newly issued refresh token using the new access token.
    const refreshResp = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Tenant-Id': tenantId,
      },
      body: JSON.stringify({ refreshToken, tenantId }),
    });

    if (refreshResp.ok) {
      const rotated = (await refreshResp.json()) as Partial<AuthResponse>;
      if (
        typeof rotated?.accessToken === 'string' &&
        rotated.accessToken.length > 0 &&
        typeof rotated?.refreshToken === 'string' &&
        rotated.refreshToken.length > 0
      ) {
        await sendLogoutRequest(rotated.accessToken, rotated.refreshToken);
      }
    }
  } catch {
    // Local state is already cleared; ignore network errors during best-effort server revocation
  }
}

function resolveSafeUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    if (path === API_BASE_URL || path.startsWith(`${API_BASE_URL}/`)) {
      return path;
    }
    throw new ApiError({
      status: 400,
      error: 'UNTRUSTED_ORIGIN',
      message: 'Güvenilmeyen harici URL adreslerine API isteği gönderilemez.',
      path,
    });
  }
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Native Fetch HTTP client enforcing LearnIQ Gateway contracts:
 * - Injects `Authorization: Bearer <accessToken>` from in-memory Redux state
 * - Injects `X-Tenant-Id` for tenant-scoped requests (never for SUPER_ADMIN or skipAuth)
 * - Never sends spoofed `X-User-Id` or `X-User-Role` headers
 * - Prevents credential leakage to arbitrary external URLs
 * - Handles concurrent 401 responses via Single-Flight Refresh Mutex with sessionEpoch guards
 */
export async function apiRequest<T = void>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    body,
    tenantId: explicitTenantId,
    skipAuth = false,
    skipRefreshOn401 = false,
    _retried = false,
    headers: customHeaders,
    ...restInit
  } = options;

  const url = resolveSafeUrl(path);

  const { auth } = store.getState();
  const isSuperAdmin = auth.user?.role === 'SUPER_ADMIN';
  const epochAtStart = auth.sessionEpoch;
  const effectiveTenantId =
    explicitTenantId !== undefined ? explicitTenantId : isSuperAdmin ? null : auth.tenantId;

  const headers = new Headers(customHeaders);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // Strictly forbid client-side spoofing of identity or auth headers (N-01, N-02, D6)
  headers.delete('X-User-Id');
  headers.delete('X-User-Role');
  headers.delete('X-Tenant-Id');
  headers.delete('Authorization');

  if (!skipAuth && auth.accessToken) {
    headers.set('Authorization', `Bearer ${auth.accessToken}`);
  }

  if (!skipAuth && !isSuperAdmin && isValidTenantId(effectiveTenantId)) {
    headers.set('X-Tenant-Id', effectiveTenantId);
  }

  let serializedBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (
      typeof body === 'string' ||
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      body instanceof Blob
    ) {
      serializedBody = body;
    } else {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      serializedBody = JSON.stringify(body);
    }
  }

  const response = await fetch(url, {
    ...restInit,
    headers,
    body: serializedBody,
  });

  if (response.status === 401 && !skipAuth) {
    if (skipRefreshOn401) {
      throw await parseErrorResponse(response);
    }

    const latestAuth = store.getState().auth;
    const wasSuperAdmin = isSuperAdmin || latestAuth.user?.role === 'SUPER_ADMIN';

    // SUPER_ADMIN has no refresh token, or if we already retried once: terminate session immediately
    if (
      _retried ||
      wasSuperAdmin ||
      !latestAuth.refreshToken ||
      !isValidTenantId(latestAuth.tenantId)
    ) {
      if (store.getState().auth.sessionEpoch === epochAtStart) {
        store.dispatch(clearAuth());
        notifySessionExpiredOnce(epochAtStart, wasSuperAdmin);
      }
      throw await parseErrorResponse(response);
    }

    const outcome = await refreshAccessTokenSingleFlight();
    if (outcome.status !== 'ok') {
      // Only wipe session and fire expiry redirect on confirmed invalid_session within the same epoch (D1, D2).
      // Preserve sessionStorage bootstrap on transient network_error so user is not logged out by brief offline drops.
      if (
        outcome.status === 'invalid_session' &&
        store.getState().auth.sessionEpoch === epochAtStart
      ) {
        store.dispatch(clearAuth());
        notifySessionExpiredOnce(epochAtStart, false);
      }
      throw await parseErrorResponse(response);
    }

    return apiRequest<T>(path, {
      ...options,
      _retried: true,
    });
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError({
      status: response.status,
      error: 'INVALID_JSON',
      message: 'Sunucudan geçersiz JSON yanıtı alındı.',
      path,
    });
  }
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<ApiRequestOptions, 'method'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
