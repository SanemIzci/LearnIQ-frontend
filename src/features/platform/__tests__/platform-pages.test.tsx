import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { store } from '@/store';
import { clearAuth, setCredentials } from '@/store/authSlice';
import { queryClient } from '@/lib/api/queryClient';
import {
  TenantsPage,
  GlobalAdminsPage,
  CreateTenantDialog,
  UpdateSubscriptionDialog,
  ResetPasswordDialog,
  CreateGlobalUserDialog,
  platformApi,
} from '@/features/platform';

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};

HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('Phase 1 — Part B: SUPER_ADMIN Platform Administration', () => {
  beforeEach(() => {
    store.dispatch(clearAuth());
    queryClient.clear();
    vi.restoreAllMocks();

    // Authenticate as SUPER_ADMIN
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'super-admin-token',
          refreshToken: null,
          role: 'SUPER_ADMIN',
          userId: '99999999-9999-9999-9999-999999999999',
          username: 'root_super_admin',
        },
        tenantId: null,
      })
    );
  });

  afterEach(() => {
    cleanup();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Tenants Listing, Search & Pagination (/platform/tenants)
  // ───────────────────────────────────────────────────────────────────────────
  it('renders tenant table with rows, metrics, status badges, and triggers search & status filters', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/api/v1/platform/admin/tenants')) {
        return new Response(
          JSON.stringify({
            totalElements: 2,
            page: 0,
            size: 15,
            content: [
              {
                id: 'ankara_fen',
                name: 'Ankara Fen Lisesi',
                domain: 'ankarafen.k12.tr',
                subscriptionStatus: 'ACTIVE',
                createdAt: '2026-09-01T10:00:00Z',
              },
              {
                id: 'izmir_ataturk',
                name: 'İzmir Atatürk Lisesi',
                domain: null,
                subscriptionStatus: 'SUSPENDED',
                createdAt: '2026-10-15T12:00:00Z',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<TenantsPage />);

    // Verify rows rendered
    expect(await screen.findByText('Ankara Fen Lisesi')).toBeInTheDocument();
    expect(screen.getByText('ankara_fen')).toBeInTheDocument();
    expect(screen.getByText('ankarafen.k12.tr')).toBeInTheDocument();
    expect(screen.getAllByText('Aktif').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('İzmir Atatürk Lisesi')).toBeInTheDocument();
    expect(screen.getByText('izmir_ataturk')).toBeInTheDocument();
    expect(screen.getAllByText('Askıya Alındı').length).toBeGreaterThanOrEqual(1);

    // Verify filter by search input
    const searchInput = screen.getByLabelText(/Kurum Ara/i);
    fireEvent.change(searchInput, { target: { value: 'Ankara' } });

    await waitFor(() => {
      const lastCallUrl = String(fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][0]);
      expect(lastCallUrl).toContain('search=Ankara');
    });

    // Verify filter by status
    const statusSelect = screen.getByLabelText(/Abonelik Durumu Filtresi/i);
    fireEvent.change(statusSelect, { target: { value: 'SUSPENDED' } });

    await waitFor(() => {
      const lastCallUrl = String(fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][0]);
      expect(lastCallUrl).toContain('status=SUSPENDED');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Tenant Provisioning Modal (CreateTenantDialog)
  // ───────────────────────────────────────────────────────────────────────────
  it('validates schema id regex client-side and provisions tenant displaying auto-generated temporary password', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith('/api/v1/platform/admin/tenants') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Record<string, string>;
        expect(body.id).toBe('bursa_fen');
        expect(body.name).toBe('Bursa Fen Lisesi');
        expect(body.adminUsername).toBe('admin_bursa');

        return new Response(
          JSON.stringify({
            tenant: {
              id: 'bursa_fen',
              name: 'Bursa Fen Lisesi',
              domain: null,
              subscriptionStatus: 'ACTIVE',
              createdAt: '2026-11-08T14:00:00Z',
            },
            adminUsername: 'admin_bursa',
            temporaryPassword: 'TempPassword14!',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/v1/platform/admin/tenants')) {
        return new Response(
          JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithProviders(<TenantsPage />);

    // Open Create Dialog
    fireEvent.click(screen.getByRole('button', { name: /Yeni Kurum Ekle/i }));

    expect(screen.getByText('Yeni Kurum (Tenant) Ekle')).toBeInTheDocument();

    const idInput = screen.getByLabelText(/Kiracı Kodu \(Şema Adı\)/i);
    const nameInput = screen.getByLabelText(/Kurum Adı/i);
    const adminUserInput = screen.getByLabelText(/Yönetici Kullanıcı Adı/i);

    // 1. Invalid schema rejection (uppercase / hyphen)
    fireEvent.change(idInput, { target: { value: 'Bursa-Fen' } });
    fireEvent.change(nameInput, { target: { value: 'Bursa Fen Lisesi' } });
    fireEvent.change(adminUserInput, { target: { value: 'admin_bursa' } });

    fireEvent.click(screen.getByRole('button', { name: /Kurumu Oluştur/i }));

    expect(
      await screen.findByText(/küçük harfle başlamalı ve yalnızca küçük harf/i)
    ).toBeInTheDocument();

    // 2. Fix schema id to valid pattern and submit without password (platform will auto-generate)
    fireEvent.change(idInput, { target: { value: 'bursa_fen' } });
    fireEvent.click(screen.getByRole('button', { name: /Kurumu Oluştur/i }));

    // Verify temporary password reveal card
    expect(await screen.findByText(/Tek Seferlik Yönetici Geçici Şifresi/i)).toBeInTheDocument();
    expect(screen.getByText('TempPassword14!')).toBeInTheDocument();
  });

  it('displays 409 conflict error when tenant id or domain already exists', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith('/api/v1/platform/admin/tenants') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({ status: 409, error: 'CONFLICT', message: 'Tenant id already exists' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    renderWithProviders(<TenantsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Yeni Kurum Ekle/i }));

    fireEvent.change(screen.getByLabelText(/Kiracı Kodu \(Şema Adı\)/i), {
      target: { value: 'ankara_fen' },
    });
    fireEvent.change(screen.getByLabelText(/Kurum Adı/i), {
      target: { value: 'Ankara Fen Lisesi' },
    });
    fireEvent.change(screen.getByLabelText(/Yönetici Kullanıcı Adı/i), {
      target: { value: 'admin_ankara' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Kurumu Oluştur/i }));

    expect(
      await screen.findByText(/Bu kiracı kodu, alan adı veya yönetici kullanıcı adı zaten kullanılmaktadır/i)
    ).toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Tenant Detail Inspection & Subscription Status Update
  // ───────────────────────────────────────────────────────────────────────────
  it('opens TenantDetailDialog to display userCount and executes subscription status patch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes('/api/v1/platform/admin/tenants/ankara_fen') && (!init || !init.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            id: 'ankara_fen',
            name: 'Ankara Fen Lisesi',
            domain: 'ankarafen.k12.tr',
            subscriptionStatus: 'ACTIVE',
            createdAt: '2026-09-01T10:00:00Z',
            userCount: 450,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/subscription') && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as { status: string };
        expect(body.status).toBe('SUSPENDED');
        return new Response(
          JSON.stringify({
            id: 'ankara_fen',
            name: 'Ankara Fen Lisesi',
            domain: 'ankarafen.k12.tr',
            subscriptionStatus: 'SUSPENDED',
            createdAt: '2026-09-01T10:00:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/v1/platform/admin/tenants')) {
        return new Response(
          JSON.stringify({
            totalElements: 1,
            page: 0,
            size: 15,
            content: [
              {
                id: 'ankara_fen',
                name: 'Ankara Fen Lisesi',
                domain: 'ankarafen.k12.tr',
                subscriptionStatus: 'ACTIVE',
                createdAt: '2026-09-01T10:00:00Z',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithProviders(<TenantsPage />);

    // 1. Open Detail Dialog
    const detailBtn = await screen.findByRole('button', { name: /Detay/i });
    fireEvent.click(detailBtn);

    expect(await screen.findByText('450')).toBeInTheDocument();
    expect(screen.getByText('Kullanıcı Sayısı')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Kapat$/i }));

    // 2. Open Subscription Dialog
    const subBtn = screen.getByRole('button', { name: /Abonelik/i });
    fireEvent.click(subBtn);

    expect(await screen.findByText(/Abonelik Durumu Güncelle/i)).toBeInTheDocument();

    const statusSelect = screen.getByLabelText(/^Abonelik Durumu$/i);
    fireEvent.change(statusSelect, { target: { value: 'SUSPENDED' } });

    fireEvent.click(screen.getByRole('button', { name: /Güncelle/i }));

    await waitFor(() => {
      const calls = fetchSpy.mock.calls;
      const patchCall = calls.find(
        (c) => String(c[0]).includes('/subscription') && c[1]?.method === 'PATCH'
      );
      expect(patchCall).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Global Admins Page (/platform/admins)
  // ───────────────────────────────────────────────────────────────────────────
  it('lists SUPER_ADMIN accounts, creates a new admin, and executes password reset', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (
        url.includes('/api/v1/platform/admin/global-users') &&
        !url.includes('/reset-password') &&
        (!init || !init.method || init.method === 'GET')
      ) {
        return new Response(
          JSON.stringify({
            totalElements: 1,
            page: 0,
            size: 15,
            content: [
              {
                id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                username: 'super_lead',
                email: 'lead@learniq.internal',
                createdAt: '2026-08-01T08:00:00Z',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (
        url.includes('/api/v1/platform/admin/global-users') &&
        !url.includes('/reset-password') &&
        init?.method === 'POST'
      ) {
        const body = JSON.parse(String(init.body)) as { username: string; email: string };
        return new Response(
          JSON.stringify({
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            username: body.username,
            email: body.email,
            createdAt: '2026-11-08T15:00:00Z',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/reset-password') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { newPassword: string };
        expect(body.newPassword).toBe('NewSecurePassword123');
        return new Response(JSON.stringify({ reset: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(null, { status: 404 });
    });

    renderWithProviders(<GlobalAdminsPage />);

    // 1. Verify list rendered
    expect(await screen.findByText('super_lead')).toBeInTheDocument();
    expect(screen.getByText('lead@learniq.internal')).toBeInTheDocument();
    expect(screen.getByText('SUPER_ADMIN')).toBeInTheDocument();

    // 2. Create Global User Dialog
    fireEvent.click(screen.getByRole('button', { name: /Yeni Yönetici Ekle/i }));

    expect(screen.getByText('Yeni Platform Yöneticisi Ekle')).toBeInTheDocument();

    const usernameInput = screen.getByLabelText(/Yönetici Kullanıcı Adı/i);
    const emailInput = screen.getByLabelText(/E-posta Adresi/i);
    const passwordInput = screen.getByLabelText(/Şifre \(en az 8 karakter\)/i);

    // Password validation (< 8 chars rejected)
    fireEvent.change(usernameInput, { target: { value: 'new_super' } });
    fireEvent.change(emailInput, { target: { value: 'new@learniq.internal' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });

    fireEvent.click(screen.getByRole('button', { name: /Hesap Oluştur/i }));

    expect(await screen.findByText(/en az 8 karakter/i)).toBeInTheDocument();

    // Valid password submit
    fireEvent.change(passwordInput, { target: { value: 'SuperPassword123' } });
    fireEvent.click(screen.getByRole('button', { name: /Hesap Oluştur/i }));

    await waitFor(() => {
      const calls = fetchSpy.mock.calls;
      const postCall = calls.find(
        (c) => c[0] === 'http://localhost:8080/api/v1/platform/admin/global-users' && c[1]?.method === 'POST'
      );
      expect(postCall).toBeDefined();
    });

    // 3. Reset Password Dialog
    const resetBtn = screen.getByRole('button', { name: /Şifre Sıfırla/i });
    fireEvent.click(resetBtn);

    expect(await screen.findByText('Yönetici Şifresini Sıfırla')).toBeInTheDocument();

    const newPwInput = screen.getByLabelText(/Yeni Şifre/i);
    fireEvent.change(newPwInput, { target: { value: 'NewSecurePassword123' } });

    fireEvent.click(screen.getByRole('button', { name: /Şifreyi Güncelle/i }));

    await waitFor(() => {
      const calls = fetchSpy.mock.calls;
      const resetCall = calls.find((c) => String(c[0]).includes('/reset-password'));
      expect(resetCall).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Pagination, Empty States, and Error UI
  // ───────────────────────────────────────────────────────────────────────────
  it('handles pagination navigation, disabled states, empty states, and server error alerts', async () => {
    // 1. Multi-page pagination test
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/v1/platform/admin/tenants')) {
        const urlObj = new URL(url);
        const page = Number(urlObj.searchParams.get('page') || 0);

        return new Response(
          JSON.stringify({
            totalElements: 25,
            page,
            size: 15,
            content: [
              {
                id: `tenant_page_${page}`,
                name: `Tenant Page ${page}`,
                domain: null,
                subscriptionStatus: 'ACTIVE',
                createdAt: '2026-11-01T10:00:00Z',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<TenantsPage />);

    expect(await screen.findByText('Tenant Page 0')).toBeInTheDocument();
    expect(screen.getByText(/Toplam/)).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: /Önceki/i });
    const nextBtn = screen.getByRole('button', { name: /Sonraki/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    // Click next page
    fireEvent.click(nextBtn);

    expect(await screen.findByText('Tenant Page 1')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Önceki/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Sonraki/i })).toBeDisabled();
    });

    // 2. Empty state test
    cleanup();
    queryClient.clear();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    renderWithProviders(<TenantsPage />);
    expect(await screen.findByText(/Kayıtlı kurum bulunamadı/i)).toBeInTheDocument();

    // 3. Error state test
    cleanup();
    queryClient.clear();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({ status: 403, error: 'FORBIDDEN', message: 'Access denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    });

    renderWithProviders(<TenantsPage />);
    expect(await screen.findByText(/Kurum listesi yüklenirken bir sorun oluştu/i)).toBeInTheDocument();
    expect(screen.queryByText(/Kayıtlı kurum bulunamadı/i)).not.toBeInTheDocument();
  });

  it('handles GlobalAdminsPage pagination, empty states, and server error alerts', async () => {
    // 1. Pagination
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/v1/platform/admin/global-users')) {
        const urlObj = new URL(url);
        const page = Number(urlObj.searchParams.get('page') || 0);

        return new Response(
          JSON.stringify({
            totalElements: 20,
            page,
            size: 15,
            content: [
              {
                id: `admin_page_${page}`,
                username: `admin_page_${page}`,
                email: `admin${page}@learniq.internal`,
                createdAt: '2026-11-01T10:00:00Z',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<GlobalAdminsPage />);

    expect(await screen.findByText('admin_page_0')).toBeInTheDocument();
    const prevBtn = screen.getByRole('button', { name: /Önceki/i });
    const nextBtn = screen.getByRole('button', { name: /Sonraki/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    fireEvent.click(nextBtn);

    expect(await screen.findByText('admin_page_1')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Önceki/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Sonraki/i })).toBeDisabled();
    });

    // 2. Empty state
    cleanup();
    queryClient.clear();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    renderWithProviders(<GlobalAdminsPage />);
    expect(await screen.findByText(/Kayıtlı yönetici hesabı bulunamadı/i)).toBeInTheDocument();

    // 3. Error state (empty state row suppressed)
    cleanup();
    queryClient.clear();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({ status: 403, error: 'FORBIDDEN', message: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    });

    renderWithProviders(<GlobalAdminsPage />);
    expect(
      await screen.findByText(/Platform yöneticileri listelenirken bir hata oluştu/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Kayıtlı yönetici hesabı bulunamadı/i)).not.toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Tenant Provisioning with custom password (temporaryPassword === null)
  // ───────────────────────────────────────────────────────────────────────────
  it('closes dialog immediately without temporary password alert when user provides adminPassword', async () => {
    let dialogOpen = true;
    const onOpenChange = vi.fn((open: boolean) => {
      dialogOpen = open;
    });

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/api/v1/platform/admin/tenants') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Record<string, string>;
        expect(body.adminPassword).toBe('CustomPassword123');
        return new Response(
          JSON.stringify({
            tenant: {
              id: 'custom_tenant',
              name: 'Custom Tenant',
              domain: 'custom.k12.tr',
              subscriptionStatus: 'ACTIVE',
              createdAt: '2026-11-08T12:00:00Z',
            },
            adminUsername: 'admin_custom',
            temporaryPassword: null,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(
      <CreateTenantDialog open={dialogOpen} onOpenChange={onOpenChange} />
    );

    fireEvent.change(screen.getByLabelText(/Kiracı Kodu \(Şema Adı\)/i), {
      target: { value: 'custom_tenant' },
    });
    fireEvent.change(screen.getByLabelText(/Kurum Adı/i), {
      target: { value: 'Custom Tenant' },
    });
    fireEvent.change(screen.getByLabelText(/Yönetici Kullanıcı Adı/i), {
      target: { value: 'admin_custom' },
    });
    fireEvent.change(screen.getByLabelText(/Yönetici Şifresi/i), {
      target: { value: 'CustomPassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Kurumu Oluştur/i }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    // Temporary password banner should never have been displayed
    expect(screen.queryByText(/Tek Seferlik Yönetici Geçici Şifresi/i)).not.toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Global User 409 Conflict & Dialog Network / Server Error Handling
  // ───────────────────────────────────────────────────────────────────────────
  it('displays 409 conflict on duplicate global user and surfaces server errors in subscription and reset dialogs', async () => {
    // 1. CreateGlobalUser 409 conflict
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/v1/platform/admin/global-users') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({ status: 409, error: 'CONFLICT', message: 'User already exists' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    });

    const onOpenChange = vi.fn();
    renderWithProviders(<CreateGlobalUserDialog open={true} onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText(/Yönetici Kullanıcı Adı/i), {
      target: { value: 'existing_super' },
    });
    fireEvent.change(screen.getByLabelText(/E-posta Adresi/i), {
      target: { value: 'existing@learniq.internal' },
    });
    fireEvent.change(screen.getByLabelText(/Şifre/i), {
      target: { value: 'SecurePassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Hesap Oluştur/i }));

    expect(
      await screen.findByText(/Bu kullanıcı adı veya e-posta adresi zaten kullanılmaktadır/i)
    ).toBeInTheDocument();

    // 2. UpdateSubscription server error handling
    cleanup();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({ status: 404, message: 'Kurum bulunamadı' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    });

    renderWithProviders(
      <UpdateSubscriptionDialog
        open={true}
        onOpenChange={vi.fn()}
        tenant={{
          id: 'nonexistent',
          name: 'Nonexistent',
          domain: null,
          subscriptionStatus: 'ACTIVE',
          createdAt: '2026-11-01T00:00:00Z',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Güncelle/i }));
    expect(await screen.findByText(/Kurum bulunamadı/i)).toBeInTheDocument();

    // 3. ResetPassword network error handling
    cleanup();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new TypeError('Failed to fetch');
    });

    renderWithProviders(
      <ResetPasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        user={{
          id: 'user-1',
          username: 'super_admin',
          email: 'admin@learniq.internal',
          createdAt: '2026-11-01T00:00:00Z',
        }}
      />
    );

    fireEvent.change(screen.getByLabelText(/Yeni Şifre/i), {
      target: { value: 'ValidPassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Şifreyi Güncelle/i }));

    expect(
      await screen.findByText(/Sunucuya bağlanılamadı\. Lütfen ağ bağlantınızı kontrol edin\./i)
    ).toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Platform Request-Header Invariants (Authorization present; X-Tenant-Id absent)
  // ───────────────────────────────────────────────────────────────────────────
  it('enforces platform security invariants: includes Authorization, strictly omits X-Tenant-Id and gateway spoofing headers', async () => {
    const interceptedRequests: { url: string; headers: Headers }[] = [];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      interceptedRequests.push({ url, headers });

      if (url.includes('/api/v1/platform/admin/tenants')) {
        return new Response(
          JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/api/v1/platform/admin/global-users')) {
        return new Response(
          JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    });

    // Execute platform API calls
    await platformApi.fetchTenants({ page: 0, size: 15 });
    await platformApi.fetchGlobalUsers({ page: 0, size: 15 });

    expect(interceptedRequests.length).toBe(2);

    for (const req of interceptedRequests) {
      // 1. Must carry valid bearer token from Redux in-memory state
      expect(req.headers.get('Authorization')).toBe('Bearer super-admin-token');

      // 2. Must strictly omit X-Tenant-Id header (SUPER_ADMIN operates at master level)
      expect(req.headers.get('X-Tenant-Id')).toBeNull();

      // 3. Must never include internal gateway spoofing headers
      expect(req.headers.get('X-User-Role')).toBeNull();
      expect(req.headers.get('X-User-Id')).toBeNull();
    }
  });
});
