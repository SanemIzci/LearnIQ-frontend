import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import { purgeTenantQueryCache } from '@/lib/api/queryClient';
import { isValidTenantId } from '@/lib/utils';
import authReducer, {
  clearAuth,
  setCredentials,
  switchTenant,
  writeSessionBootstrap,
  type AuthState,
} from './authSlice';
import uiReducer, { type UiState } from './uiSlice';

export interface RootState {
  auth: AuthState;
  ui: UiState;
}

type AbortRefreshCallback = () => void;
let registeredAbortRefresh: AbortRefreshCallback | null = null;

export function registerAbortRefreshCallback(cb: AbortRefreshCallback | null): void {
  registeredAbortRefresh = cb;
}

const authSideEffectsMiddleware = createListenerMiddleware<RootState>();

authSideEffectsMiddleware.startListening({
  actionCreator: setCredentials,
  effect: (action, listenerApi) => {
    const prevAuth = listenerApi.getOriginalState().auth;
    const nextAuth = listenerApi.getState().auth;

    if (
      prevAuth.tenantId !== nextAuth.tenantId ||
      (prevAuth.user?.id && prevAuth.user.id !== nextAuth.user?.id)
    ) {
      purgeTenantQueryCache();
    }

    const { auth } = action.payload;
    if (
      auth.role !== 'SUPER_ADMIN' &&
      nextAuth.refreshToken &&
      isValidTenantId(nextAuth.tenantId)
    ) {
      writeSessionBootstrap({
        refreshToken: nextAuth.refreshToken,
        tenantId: nextAuth.tenantId,
      });
    } else {
      // SUPER_ADMIN has no refresh token — never write tokens to web storage
      writeSessionBootstrap(null);
    }
  },
});

authSideEffectsMiddleware.startListening({
  matcher: isAnyOf(switchTenant, clearAuth),
  effect: () => {
    registeredAbortRefresh?.();
    purgeTenantQueryCache();
    writeSessionBootstrap(null);
  },
});

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(authSideEffectsMiddleware.middleware),
});

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
