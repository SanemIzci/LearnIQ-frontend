import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { store } from '@/store';
import { clearAuth, setCredentials } from '@/store/authSlice';
import { queryClient, tenantQueryKey } from '@/lib/api/queryClient';
import {
  TenantLoginPage,
  PlatformLoginPage,
  TenantSwitchModal,
  LAST_TENANT_ID_STORAGE_KEY,
} from '@/features/auth';

function LocationDisplay() {
  const location = useLocation();
  return (
    <div data-testid="location-display">
      {location.pathname}
      {location.search}
    </div>
  );
}

const mockLocalStorage = (() => {
  let storage: Record<string, string> = {};
  return {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, val: string) => {
      storage[key] = String(val);
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      storage = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};

HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

describe('Phase 1 — Part A: Authentication & Session Lifecycle', () => {
  beforeEach(() => {
    store.dispatch(clearAuth());
    queryClient.clear();
    window.sessionStorage.clear();
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Tenant Login Page (/login)
  // ───────────────────────────────────────────────────────────────────────────
  it('pre-fills tenantId from URL query param (?tenant=...) or localStorage and validates tenant schema regex', async () => {
    window.localStorage.setItem(LAST_TENANT_ID_STORAGE_KEY, 'stored_tenant');

    // 1. URL param takes precedence
    const { unmount } = render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login?tenant=url_tenant']}>
          <Routes>
            <Route path="/login" element={<TenantLoginPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    const tenantInput = screen.getByLabelText(/Kurum \(Tenant\) Kodu/i) as HTMLInputElement;
    expect(tenantInput.value).toBe('url_tenant');
    unmount();

    // 2. Falls back to localStorage when URL param is absent
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<TenantLoginPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    const fallbackInput = screen.getByLabelText(/Kurum \(Tenant\) Kodu/i) as HTMLInputElement;
    expect(fallbackInput.value).toBe('stored_tenant');

    // 3. Client-side schema rejection: invalid tenant regex does NOT fire network call
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fireEvent.change(fallbackInput, { target: { value: 'Invalid-Tenant' } });
    fireEvent.change(screen.getByLabelText(/Kullanıcı Adı/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Şifre/i), { target: { value: 'secret123' } });

    fireEvent.click(screen.getByRole('button', { name: /Giriş Yap/i }));

    expect(
      await screen.findByText(/küçük harfle başlamalı ve yalnızca küçük harf/i)
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('successfully logs in tenant user, saves ONLY tenantId to localStorage, and redirects to role landing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: 'fresh-tenant-access-token',
          refreshToken: 'fresh-tenant-refresh-token',
          role: 'ADMIN',
          userId: '11111111-1111-1111-1111-111111111111',
          username: 'admin_ankara',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<TenantLoginPage />} />
            <Route path="/staff/overview" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    fireEvent.change(screen.getByLabelText(/Kurum \(Tenant\) Kodu/i), {
      target: { value: 'ankara_fen' },
    });
    fireEvent.change(screen.getByLabelText(/Kullanıcı Adı/i), {
      target: { value: 'admin_ankara' },
    });
    fireEvent.change(screen.getByLabelText(/Şifre/i), {
      target: { value: 'AdminPassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Giriş Yap/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-display').textContent).toBe('/staff/overview');
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [callUrl, callInit] = fetchSpy.mock.calls[0];
    expect(String(callUrl)).toContain('/api/v1/auth/login');
    const sentBody = JSON.parse(String(callInit?.body)) as {
      tenantId: string;
      username: string;
      password: string;
    };
    expect(sentBody).toEqual({
      tenantId: 'ankara_fen',
      username: 'admin_ankara',
      password: 'AdminPassword123',
    });

    // Redux auth state established
    const authState = store.getState().auth;
    expect(authState.isAuthenticated).toBe(true);
    expect(authState.accessToken).toBe('fresh-tenant-access-token');
    expect(authState.tenantId).toBe('ankara_fen');
    expect(authState.user?.role).toBe('ADMIN');

    // ONLY the tenant identifier is remembered in localStorage; NEVER password or tokens
    expect(window.localStorage.getItem(LAST_TENANT_ID_STORAGE_KEY)).toBe('ankara_fen');
    expect(window.localStorage.getItem('password')).toBeNull();
    expect(window.localStorage.getItem('token')).toBeNull();
  });

  it('redirects to original location from state when user was intercepted by RoleGuard', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: 'student-token',
          refreshToken: 'student-refresh',
          role: 'STUDENT',
          userId: '22222222-2222-2222-2222-222222222222',
          username: 'student1',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(
      <Provider store={store}>
        <MemoryRouter
          initialEntries={[{ pathname: '/login', state: { from: '/student/exams' } }]}
        >
          <Routes>
            <Route path="/login" element={<TenantLoginPage />} />
            <Route path="/student/exams" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    fireEvent.change(screen.getByLabelText(/Kurum \(Tenant\) Kodu/i), {
      target: { value: 'izmir_fen' },
    });
    fireEvent.change(screen.getByLabelText(/Kullanıcı Adı/i), {
      target: { value: 'student1' },
    });
    fireEvent.change(screen.getByLabelText(/Şifre/i), {
      target: { value: 'StudentPassword1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Giriş Yap/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-display').textContent).toBe('/student/exams');
    });
  });

  it('displays contextual error alerts for 401 Bad Credentials and 403 Suspended Tenant', async () => {
    // 401 scenario
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 401, error: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<TenantLoginPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    fireEvent.change(screen.getByLabelText(/Kurum \(Tenant\) Kodu/i), {
      target: { value: 'ankara_fen' },
    });
    fireEvent.change(screen.getByLabelText(/Kullanıcı Adı/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Şifre/i), { target: { value: 'wrong_pw' } });
    fireEvent.click(screen.getByRole('button', { name: /Giriş Yap/i }));

    expect(await screen.findByText(/Kullanıcı adı veya şifre hatalı/i)).toBeInTheDocument();

    // 403 scenario (tenant subscription suspended)
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: 403, error: 'FORBIDDEN', message: 'Tenant subscription suspended' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    );

    fireEvent.click(screen.getByRole('button', { name: /Giriş Yap/i }));

    expect(
      await screen.findByText(/Kurum aboneliği aktif değil/i)
    ).toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Platform SUPER_ADMIN Login Page (/platform/login)
  // ───────────────────────────────────────────────────────────────────────────
  it('renders strictly NO tenant input, logs in SUPER_ADMIN, and navigates to /platform/tenants', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: 'super-admin-access-token',
          refreshToken: null,
          role: 'SUPER_ADMIN',
          userId: '99999999-9999-9999-9999-999999999999',
          username: 'root_admin',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/platform/login']}>
          <Routes>
            <Route path="/platform/login" element={<PlatformLoginPage />} />
            <Route path="/platform/tenants" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    // Verify tenant input does not exist
    expect(screen.queryByLabelText(/Kurum/i)).toBeNull();

    fireEvent.change(screen.getByLabelText(/Yönetici Kullanıcı Adı/i), {
      target: { value: 'root_admin' },
    });
    fireEvent.change(screen.getByLabelText(/Şifre/i), {
      target: { value: 'RootPassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Platforma Giriş Yap/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-display').textContent).toBe('/platform/tenants');
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [callUrl, callInit] = fetchSpy.mock.calls[0];
    expect(String(callUrl)).toContain('/api/v1/platform/auth/login');
    const sentBody = JSON.parse(String(callInit?.body)) as Record<string, string>;
    expect(sentBody).toEqual({ username: 'root_admin', password: 'RootPassword123' });
    expect(sentBody).not.toHaveProperty('tenantId');

    const authState = store.getState().auth;
    expect(authState.isAuthenticated).toBe(true);
    expect(authState.user?.role).toBe('SUPER_ADMIN');
    expect(authState.tenantId).toBeNull();
    expect(authState.refreshToken).toBeNull();
    // Zero web storage persistence for SUPER_ADMIN
    expect(window.sessionStorage.getItem('learniq_tenant_refresh_bootstrap')).toBeNull();
  });

  it('displays session expired alert banner when ?reason=expired is present on /platform/login', () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/platform/login?reason=expired']}>
          <Routes>
            <Route path="/platform/login" element={<PlatformLoginPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText(/Oturum Süresi Doldu/i)).toBeInTheDocument();
    expect(
      screen.getByText(/SUPER_ADMIN platform oturumunuzun süresi doldu/i)
    ).toBeInTheDocument();
  });

  it('displays session expired and tenant switched banners on /login when reason parameter is present (F1, F2)', () => {
    const { unmount } = render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login?reason=expired']}>
          <Routes>
            <Route path="/login" element={<TenantLoginPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText(/Oturum Süresi Doldu/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Oturumunuzun süresi doldu\. Güvenliğiniz için lütfen yeniden giriş yapın/i)
    ).toBeInTheDocument();
    unmount();

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login?reason=switched&tenant=tenant_izmir']}>
          <Routes>
            <Route path="/login" element={<TenantLoginPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText(/Kurum Değiştirildi/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Farklı bir kuruma geçiş yapıldı\. Lütfen yeni kurum hesabınızla giriş yapın/i)
    ).toBeInTheDocument();
  });

  it('preserves location.state.from deep-link when SUPER_ADMIN logs in (F5)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: 'super-admin-access-token',
          refreshToken: null,
          role: 'SUPER_ADMIN',
          userId: '99999999-9999-9999-9999-999999999999',
          username: 'root_admin',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(
      <Provider store={store}>
        <MemoryRouter
          initialEntries={[{ pathname: '/platform/login', state: { from: '/platform/admins' } }]}
        >
          <Routes>
            <Route path="/platform/login" element={<PlatformLoginPage />} />
            <Route path="/platform/admins" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    fireEvent.change(screen.getByLabelText(/Yönetici Kullanıcı Adı/i), {
      target: { value: 'root_admin' },
    });
    fireEvent.change(screen.getByLabelText(/Şifre/i), {
      target: { value: 'RootPassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Platforma Giriş Yap/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-display').textContent).toBe('/platform/admins');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. In-App Tenant Switcher Modal & Session Lifecycle
  // ───────────────────────────────────────────────────────────────────────────
  it('terminates previous session, bumps sessionEpoch, purges query cache, and sets isInitialized=true on switchTenant', async () => {
    // 1. Establish initial authenticated session for tenant_ankara
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'ankara-jwt',
          refreshToken: 'ankara-refresh',
          role: 'ADMIN',
          userId: '11111111-1111-1111-1111-111111111111',
          username: 'admin1',
        },
        tenantId: 'tenant_ankara',
      })
    );

    const initialEpoch = store.getState().auth.sessionEpoch;

    // Cache some tenant_ankara data
    const ankaraKey = tenantQueryKey('tenant_ankara', 'classrooms');
    queryClient.setQueryData(ankaraKey, [{ id: 'class-1' }]);
    expect(queryClient.getQueryData(ankaraKey)).toEqual([{ id: 'class-1' }]);

    const onOpenChange = vi.fn();

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/staff/overview']}>
          <TenantSwitchModal
            open={true}
            onOpenChange={onOpenChange}
            currentTenantId="tenant_ankara"
          />
          <Routes>
            <Route path="/login" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    const switchInput = screen.getByLabelText(/Yeni Kurum \(Tenant\) Kodu/i);
    fireEvent.change(switchInput, { target: { value: 'tenant_bursa' } });

    fireEvent.click(screen.getByRole('button', { name: /Kurumu Değiştir/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-display').textContent).toBe(
        '/login?tenant=tenant_bursa&reason=switched'
      );
    });

    const newAuth = store.getState().auth;
    expect(newAuth.isAuthenticated).toBe(false);
    expect(newAuth.accessToken).toBeNull();
    expect(newAuth.refreshToken).toBeNull();
    expect(newAuth.tenantId).toBe('tenant_bursa');
    expect(newAuth.sessionEpoch).toBeGreaterThan(initialEpoch);
    expect(newAuth.isInitialized).toBe(true);

    // Query cache for old tenant must be purged
    expect(queryClient.getQueryData(ankaraKey)).toBeUndefined();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
