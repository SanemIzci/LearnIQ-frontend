import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthResponse, UserRole } from '@/types/api';
import { decodeJwtExpiryMs, isValidTenantId, isValidUserRole } from '@/lib/utils';

export const SESSION_BOOTSTRAP_KEY = 'learniq_tenant_refresh_bootstrap';

export interface SessionBootstrap {
  refreshToken: string;
  tenantId: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface AuthState {
  /**
   * Access token is held strictly IN-MEMORY (never persisted to localStorage or sessionStorage).
   */
  accessToken: string | null;
  /**
   * Refresh token is present only for tenant users (ADMIN, TEACHER, STUDENT).
   * Always null for SUPER_ADMIN platform sessions.
   */
  refreshToken: string | null;
  user: AuthUser | null;
  /**
   * Active tenant schema identifier (null for SUPER_ADMIN).
   */
  tenantId: string | null;
  isAuthenticated: boolean;
  /**
   * Epoch milliseconds decoded from the JWT `exp` claim for UX expiry warnings.
   */
  sessionExpiresAt: number | null;
  /**
   * Indicates whether initial silent session bootstrap check has completed.
   */
  isInitialized: boolean;
  /**
   * Monotonically increasing session generation counter.
   * Incremented on logout (`clearAuth`), tenant switch (`switchTenant`), or user/tenant change
   * so stale in-flight refresh responses can never resurrect a terminated session.
   */
  sessionEpoch: number;
}

export function readSessionBootstrap(): SessionBootstrap | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_BOOTSTRAP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionBootstrap>;
    if (
      typeof parsed.refreshToken === 'string' &&
      parsed.refreshToken.length > 0 &&
      isValidTenantId(parsed.tenantId)
    ) {
      return {
        refreshToken: parsed.refreshToken,
        tenantId: parsed.tenantId,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeSessionBootstrap(bootstrap: SessionBootstrap | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!bootstrap) {
      window.sessionStorage.removeItem(SESSION_BOOTSTRAP_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_BOOTSTRAP_KEY, JSON.stringify(bootstrap));
    }
  } catch {
    // Ignore storage quota / privacy mode errors; in-memory state still works
  }
}

export const PLATFORM_BOOTSTRAP_KEY = 'learniq_platform_session';

export interface PlatformBootstrap {
  accessToken: string;
  user: AuthUser;
  sessionExpiresAt: number | null;
}

export function readPlatformBootstrap(): PlatformBootstrap | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PLATFORM_BOOTSTRAP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlatformBootstrap>;
    if (
      typeof parsed.accessToken === 'string' &&
      parsed.accessToken.length > 0 &&
      parsed.user?.role === 'SUPER_ADMIN' &&
      typeof parsed.sessionExpiresAt === 'number' &&
      parsed.sessionExpiresAt > Date.now()
    ) {
      return {
        accessToken: parsed.accessToken,
        user: parsed.user,
        sessionExpiresAt: parsed.sessionExpiresAt,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function writePlatformBootstrap(bootstrap: PlatformBootstrap | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!bootstrap) {
      window.sessionStorage.removeItem(PLATFORM_BOOTSTRAP_KEY);
    } else {
      window.sessionStorage.setItem(PLATFORM_BOOTSTRAP_KEY, JSON.stringify(bootstrap));
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

const initialPlatformBootstrap = readPlatformBootstrap();
const initialBootstrap = readSessionBootstrap();

const initialState: AuthState = {
  accessToken: initialPlatformBootstrap?.accessToken ?? null,
  refreshToken: initialBootstrap?.refreshToken ?? null,
  user: initialPlatformBootstrap?.user ?? null,
  tenantId: initialBootstrap?.tenantId ?? null,
  isAuthenticated: initialPlatformBootstrap !== null,
  sessionExpiresAt: initialPlatformBootstrap?.sessionExpiresAt ?? null,
  isInitialized: initialPlatformBootstrap !== null || initialBootstrap === null,
  sessionEpoch: 1,
};

export interface SetCredentialsPayload {
  auth: AuthResponse;
  tenantId: string | null;
}

export function isValidCredentialsPayload(payload: SetCredentialsPayload | null | undefined): boolean {
  if (!payload || !payload.auth) return false;
  const { auth, tenantId } = payload;
  if (
    typeof auth.accessToken !== 'string' ||
    auth.accessToken.trim() === '' ||
    typeof auth.userId !== 'string' ||
    auth.userId.trim() === '' ||
    typeof auth.username !== 'string' ||
    auth.username.trim() === '' ||
    !isValidUserRole(auth.role)
  ) {
    return false;
  }
  if (auth.role === 'SUPER_ADMIN') {
    return true;
  }
  return (
    isValidTenantId(tenantId) &&
    typeof auth.refreshToken === 'string' &&
    auth.refreshToken.trim() !== ''
  );
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<SetCredentialsPayload>) {
      if (!isValidCredentialsPayload(action.payload)) {
        return;
      }

      const { auth, tenantId } = action.payload;
      const isSuperAdmin = auth.role === 'SUPER_ADMIN';
      const normalizedTenantId = isSuperAdmin
        ? null
        : isValidTenantId(tenantId)
          ? tenantId
          : null;

      // Bump sessionEpoch if tenant or user identity changed
      if (
        (state.isAuthenticated && state.tenantId !== normalizedTenantId) ||
        (state.user !== null && state.user.id !== auth.userId)
      ) {
        state.sessionEpoch += 1;
      }

      state.accessToken = auth.accessToken;
      state.refreshToken = isSuperAdmin ? null : auth.refreshToken;
      state.user = {
        id: auth.userId,
        username: auth.username,
        role: auth.role,
      };
      state.tenantId = normalizedTenantId;
      state.isAuthenticated = true;
      state.sessionExpiresAt = decodeJwtExpiryMs(auth.accessToken);
      state.isInitialized = true;
    },

    switchTenant(state, action: PayloadAction<string | null>) {
      const nextTenantId = action.payload;
      const validNextTenant = isValidTenantId(nextTenantId) ? nextTenantId : null;
      if (state.tenantId !== validNextTenant || state.isAuthenticated) {
        state.sessionEpoch += 1;
        state.tenantId = validNextTenant;
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        state.isAuthenticated = false;
        state.sessionExpiresAt = null;
        state.isInitialized = true;
      }
    },

    clearAuth(state) {
      state.sessionEpoch += 1;
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.tenantId = null;
      state.isAuthenticated = false;
      state.sessionExpiresAt = null;
      state.isInitialized = true;
    },

    hydrateFromSessionBootstrap(state, action: PayloadAction<SessionBootstrap | null>) {
      const bootstrap = action.payload;
      state.sessionEpoch += 1;
      state.accessToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.sessionExpiresAt = null;
      if (bootstrap && isValidTenantId(bootstrap.tenantId) && bootstrap.refreshToken) {
        state.refreshToken = bootstrap.refreshToken;
        state.tenantId = bootstrap.tenantId;
        state.isInitialized = false;
      } else {
        state.refreshToken = null;
        state.tenantId = null;
        state.isInitialized = true;
      }
    },

    markAuthInitialized(state) {
      state.isInitialized = true;
    },
  },
});

export const {
  setCredentials,
  switchTenant,
  clearAuth,
  hydrateFromSessionBootstrap,
  markAuthInitialized,
} = authSlice.actions;

export default authSlice.reducer;
