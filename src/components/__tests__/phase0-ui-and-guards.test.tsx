import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { store } from '@/store';
import { clearAuth, setCredentials } from '@/store/authSlice';
import { RoleGuard } from '@/routes/RoleGuard';
import { Dialog } from '@/components/ui/dialog';
import { AppShell } from '@/components/layout/AppShell';
import { SuperAdminExpiryBanner } from '@/components/layout/SuperAdminExpiryBanner';

function LocationDisplay() {
  const location = useLocation();
  const fromState = (location.state as { from?: string } | null)?.from ?? '';
  return (
    <div data-testid="location-display">
      {location.pathname}
      {location.search}
      {fromState ? `|from:${fromState}` : ''}
    </div>
  );
}

function createJwtWithExp(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: 'super-id', exp: expSeconds }));
  return `${header}.${payload}.sig`;
}

describe('Phase 0 UI Primitives, RoleGuard & Session Expiry Behavior', () => {
  beforeEach(() => {
    store.dispatch(clearAuth());
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('redirects unauthenticated tenant route access to /login preserving state.from, and platform routes to /platform/login', () => {
    const { unmount } = render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/staff/exams']}>
          <Routes>
            <Route path="/login" element={<LocationDisplay />} />
            <Route element={<RoleGuard allowedRoles={['ADMIN', 'TEACHER']} />}>
              <Route path="/staff/exams" element={<div>Exams Protected</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByTestId('location-display').textContent).toBe('/login|from:/staff/exams');
    unmount();

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/platform/tenants']}>
          <Routes>
            <Route path="/platform/login" element={<LocationDisplay />} />
            <Route element={<RoleGuard allowedRoles={['SUPER_ADMIN']} />}>
              <Route path="/platform/tenants" element={<div>Platform Protected</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByTestId('location-display').textContent).toBe(
      '/platform/login|from:/platform/tenants'
    );
  });

  it('redirects authenticated users to their role home when accessing an unauthorized route', () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'student-jwt',
          refreshToken: 'student-refresh',
          role: 'STUDENT',
          userId: '77777777-7777-7777-7777-777777777777',
          username: 'ogrenci_ali',
        },
        tenantId: 'tenant_ankara',
      })
    );

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/staff/exams']}>
          <Routes>
            <Route path="/student/home" element={<LocationDisplay />} />
            <Route element={<RoleGuard allowedRoles={['ADMIN', 'TEACHER']} />}>
              <Route path="/staff/exams" element={<div>Staff Only</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByTestId('location-display').textContent).toBe('/student/home');
  });

  it('manages native <dialog> showModal/close lifecycle, ARIA labels, and backdrop light-dismiss fallback', () => {
    const showModalMock = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    const closeMock = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    });

    HTMLDialogElement.prototype.showModal = showModalMock;
    HTMLDialogElement.prototype.close = closeMock;

    const onOpenChange = vi.fn();

    render(
      <Dialog
        open={true}
        onOpenChange={onOpenChange}
        title="Sınav Kuralı Tanımla"
        description="Net hesabı için soru sayısı ve ceza böleni girin."
      >
        <button type="button">Kaydet</button>
      </Dialog>
    );

    expect(showModalMock).toHaveBeenCalledTimes(1);
    const dialogEl = document.querySelector('dialog')!;
    expect(dialogEl).not.toBeNull();
    expect(dialogEl.getAttribute('closedby')).toBe('any');

    const titleId = dialogEl.getAttribute('aria-labelledby')!;
    const descId = dialogEl.getAttribute('aria-describedby')!;
    expect(document.getElementById(titleId)?.textContent).toBe('Sınav Kuralı Tanımla');
    expect(document.getElementById(descId)?.textContent).toBe(
      'Net hesabı için soru sayısı ve ceza böleni girin.'
    );

    // Clicking the close button closes the dialog and triggers onOpenChange(false)
    const closeBtn = screen.getByLabelText('Pencereyi kapat');
    fireEvent.click(closeBtn);
    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays SUPER_ADMIN expiry countdown within 2 minutes and auto-terminates session at 0 seconds', () => {
    vi.useFakeTimers();
    const nowMs = new Date('2026-11-08T14:00:00Z').getTime();
    vi.setSystemTime(nowMs);

    // Expire in 90 seconds (within the 2-minute warning threshold)
    const expSeconds = Math.floor((nowMs + 90_000) / 1000);
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: createJwtWithExp(expSeconds),
          refreshToken: null,
          role: 'SUPER_ADMIN',
          userId: '99999999-9999-9999-9999-999999999999',
          username: 'root',
        },
        tenantId: null,
      })
    );

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/platform/tenants']}>
          <SuperAdminExpiryBanner />
          <Routes>
            <Route path="/platform/tenants" element={<div>Tenants View</div>} />
            <Route path="/platform/login" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    const statusBanner = screen.getByRole('status');
    expect(statusBanner.textContent).toContain('90 saniye');

    // Advance clock past expiration (95 seconds later) inside act()
    act(() => {
      vi.setSystemTime(nowMs + 95_000);
      vi.advanceTimersByTime(5_000);
    });

    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(screen.getByTestId('location-display').textContent).toBe(
      '/platform/login?reason=expired'
    );
  });

  it('closes mobile navigation drawer and clears <main inert> when viewport resizes to desktop >= 1024px (D4)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 390,
    });

    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'admin-jwt',
          refreshToken: 'admin-refresh',
          role: 'ADMIN',
          userId: '11111111-1111-1111-1111-111111111111',
          username: 'admin_ankara',
        },
        tenantId: 'tenant_ankara',
      })
    );

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/staff/overview']}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/staff/overview" element={<div>Overview Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    const mainEl = document.getElementById('content')!;
    expect(mainEl.hasAttribute('inert')).toBe(false);

    // Open mobile drawer on 390px viewport
    const menuBtn = screen.getByLabelText('Menüyü aç');
    fireEvent.click(menuBtn);
    expect(store.getState().ui.mobileNavOpen).toBe(true);
    expect(mainEl.hasAttribute('inert')).toBe(true);

    // Resize viewport to desktop (1280px >= 1024px)
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(store.getState().ui.mobileNavOpen).toBe(false);
    expect(mainEl.hasAttribute('inert')).toBe(false);
  });
});
