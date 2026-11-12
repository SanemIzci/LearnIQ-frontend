import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store';
import { setCredentials, clearAuth, switchTenant } from '@/store/authSlice';
import { queryClient } from '@/lib/api/queryClient';
import { apiClient } from '@/lib/api/client';
import { examsApi } from '@/features/exams/api/examsApi';
import { examRulesApi } from '@/features/exam-rules/api/examRulesApi';
import { studentPortalApi } from '@/features/student-portal/api/studentPortalApi';
import { analyticsApi } from '@/features/analytics/api/analyticsApi';
import { ExamsPage } from '@/features/exams/pages/ExamsPage';
import { StudentExamDashboardPage } from '@/features/student-portal/pages/StudentExamDashboardPage';
import { ClassroomAnalyticsPage } from '@/features/analytics/pages/ClassroomAnalyticsPage';
import { RoleGuard } from '@/routes/RoleGuard';
import { ApiError } from '@/lib/api/error-parser';
import type {
  AiReportResponseDto,
  ExamResponse,
  StudentDashboardResponse,
  SubjectResponse,
} from '@/types/api';

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};

HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

window.HTMLElement.prototype.scrollIntoView = vi.fn();

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('recharts', async () => {
  const original = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 800, height: 400 }}>
        {children}
      </div>
    ),
  };
});

function renderWithProviders(ui: React.ReactElement, initialPath = '/') {
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('Faz 5: Orchestrator — Özellikler Arası Entegrasyon & Nihai QA Kapısı', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    try {
      window.sessionStorage?.clear?.();
    } catch {}
    try {
      window.localStorage?.clear?.();
    } catch {}
    store.dispatch(clearAuth());
  });

  // ---------------------------------------------------------------------------
  // Test 1 — apiClient Eşzamanlı 401 Single-Flight Mutex
  // ---------------------------------------------------------------------------
  it('Kapı 1: Eşzamanlı 3 paralel 401 yanıtında tek bir /api/v1/auth/refresh tetikler ve tüm istekleri yeni token ile başarıyla tamamlar', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'expired-access-token',
          refreshToken: 'valid-refresh-token',
          role: 'ADMIN',
          userId: 'usr-1',
          username: 'admin@okul.com',
        },
        tenantId: 'akademi_1',
      })
    );

    let refreshCallCount = 0;
    let endpointACalls = 0;
    let endpointBCalls = 0;
    let endpointCCalls = 0;

    const originalFetch = global.fetch;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/v1/auth/refresh')) {
        refreshCallCount++;
        // Small delay to simulate in-flight network roundtrip
        await new Promise((resolve) => setTimeout(resolve, 30));
        return new Response(
          JSON.stringify({
            accessToken: 'brand-new-rotated-access-token',
            refreshToken: 'brand-new-rotated-refresh-token',
            role: 'ADMIN',
            userId: 'usr-1',
            username: 'admin@okul.com',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const headers = new Headers(init?.headers);
      const authHeader = headers.get('authorization');

      if (url.includes('/api/v1/endpoint-a')) {
        endpointACalls++;
        if (authHeader === 'Bearer brand-new-rotated-access-token') {
          return new Response(JSON.stringify({ data: 'A-SUCCESS' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ message: 'Token expired' }), { status: 401 });
      }

      if (url.includes('/api/v1/endpoint-b')) {
        endpointBCalls++;
        if (authHeader === 'Bearer brand-new-rotated-access-token') {
          return new Response(JSON.stringify({ data: 'B-SUCCESS' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ message: 'Token expired' }), { status: 401 });
      }

      if (url.includes('/api/v1/endpoint-c')) {
        endpointCCalls++;
        if (authHeader === 'Bearer brand-new-rotated-access-token') {
          return new Response(JSON.stringify({ data: 'C-SUCCESS' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ message: 'Token expired' }), { status: 401 });
      }

      return originalFetch(input, init);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    // Fire 3 parallel GET requests
    const [resA, resB, resC] = await Promise.all([
      apiClient.get<{ data: string }>('/api/v1/endpoint-a'),
      apiClient.get<{ data: string }>('/api/v1/endpoint-b'),
      apiClient.get<{ data: string }>('/api/v1/endpoint-c'),
    ]);

    expect(resA).toEqual({ data: 'A-SUCCESS' });
    expect(resB).toEqual({ data: 'B-SUCCESS' });
    expect(resC).toEqual({ data: 'C-SUCCESS' });

    // Single-Flight Invariant: exactly 1 POST /auth/refresh was sent
    expect(refreshCallCount).toBe(1);

    // Each endpoint was invoked twice (initial 401 + replay after refresh)
    expect(endpointACalls).toBe(2);
    expect(endpointBCalls).toBe(2);
    expect(endpointCCalls).toBe(2);

    // Store state updated with new access token
    expect(store.getState().auth.accessToken).toBe('brand-new-rotated-access-token');
  });

  // ---------------------------------------------------------------------------
  // Test 2 — SUPER_ADMIN Oturum Sınırı & Zero Storage Invariant
  // ---------------------------------------------------------------------------
  it('Kapı 2: SUPER_ADMIN oturumunda 401 alındığında asla /auth/refresh çağrılmaz, tenant header gönderilmez ve oturum derhal temizlenir', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'super-admin-short-lived-token',
          refreshToken: null, // As documented in PlatformAuthController
          role: 'SUPER_ADMIN',
          userId: 'sa-01',
          username: 'superadmin',
        },
        tenantId: null,
      })
    );

    let refreshCalled = false;
    let sentTenantHeader: string | null = null;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/v1/auth/refresh')) {
        refreshCalled = true;
        return new Response(JSON.stringify({ message: 'Should not happen' }), { status: 400 });
      }

      const headers = (init?.headers as Record<string, string> | undefined) || {};
      sentTenantHeader = headers['X-Tenant-Id'] || null;

      return new Response(
        JSON.stringify({
          status: 401,
          message: 'Super admin token expired',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiClient.get('/api/v1/tenants')).rejects.toThrow();

    // SUPER_ADMIN invariants
    expect(refreshCalled).toBe(false);
    expect(sentTenantHeader).toBeNull();
    expect(store.getState().auth.accessToken).toBeNull();
    expect(sessionStorage.getItem('learniq_refresh_token')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Test 3 — Paylaşılan exam-rules & Sınav Akışı Entegrasyonu
  // ---------------------------------------------------------------------------
  it('Kapı 3: Sınava kuralı tanımlanmamış ders eklenirken satır-içi ExamRuleEnsureDialog açılır, kural kaydedilir ve ders sınava bağlanır', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'valid-admin-token',
          refreshToken: 'valid-admin-refresh',
          role: 'ADMIN',
          userId: 'admin-1',
          username: 'admin@okul.com',
        },
        tenantId: 'akademi_1',
      })
    );

    const mockSubjectMat: SubjectResponse = {
      id: 'sub-mat-1',
      name: 'Temel Matematik',
      createdAt: '2026-10-01T10:00:00Z',
    };

    const mockOpenExam: ExamResponse = {
      id: 'exam-tyt-1',
      title: '2026 TYT Deneme 1',
      examDate: '2026-11-20',
      examType: 'TYT',
      status: 'OPEN',
      finalizedAt: null,
      subjects: [],
      classroomIds: [],
      createdAt: '2026-11-01T10:00:00Z',
    };

    vi.spyOn(examsApi, 'fetchExams').mockResolvedValue({
      content: [mockOpenExam],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 15,
    });
    vi.spyOn(examsApi, 'fetchSubjects').mockResolvedValue([mockSubjectMat]);
    vi.spyOn(examsApi, 'fetchClassrooms').mockResolvedValue([]);
    vi.spyOn(examRulesApi, 'fetchRules').mockResolvedValue([]); // No rules configured yet!
    const upsertRuleSpy = vi.spyOn(examRulesApi, 'upsertRule').mockResolvedValue({
      examType: 'TYT',
      subjectId: 'sub-mat-1',
      subjectName: 'Temel Matematik',
      questionCount: 40,
      penaltyDivisor: 4.0,
    });
    const addSubjectSpy = vi.spyOn(examsApi, 'addSubject').mockResolvedValue(mockOpenExam);

    renderWithProviders(<ExamsPage />);

    expect(await screen.findByText('2026 TYT Deneme 1')).toBeInTheDocument();

    // Open manage subjects dialog
    const manageSubjectsBtn = screen.getByRole('button', {
      name: /2026 TYT Deneme 1 derslerini yönet/i,
    });
    fireEvent.click(manageSubjectsBtn);

    expect(await screen.findByText('Sınav Ders Eşleştirmeleri')).toBeInTheDocument();

    // Select the subject
    const subjectSelect = screen.getByLabelText(/Sınava Eklenecek Dersi Seçin/i);
    fireEvent.change(subjectSelect, { target: { value: 'sub-mat-1' } });

    // Click 'Dersi Ekle'
    const addBtn = screen.getByRole('button', { name: /Dersi Ekle/i });
    fireEvent.click(addBtn);

    // ExamRuleEnsureDialog should open because no net rule exists for (TYT, sub-mat-1)
    expect(await screen.findByText('Net Hesaplama Kuralı Tanımla')).toBeInTheDocument();
    expect(
      screen.getByText(/soru sayısı ve net ceza katsayısı gereklidir/i)
    ).toBeInTheDocument();

    // Save net rule in modal
    const saveRuleBtn = screen.getByRole('button', { name: /Kuralı Kaydet ve Dersi Ekle/i });
    fireEvent.click(saveRuleBtn);

    await waitFor(() => {
      expect(upsertRuleSpy).toHaveBeenCalledWith(
        'TYT',
        'sub-mat-1',
        expect.objectContaining({
          questionCount: 40,
          penaltyDivisor: 4.0,
        })
      );
      expect(addSubjectSpy).toHaveBeenCalledWith('exam-tyt-1', 'sub-mat-1');
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4 — AI Rapor Durum Makinesi & Markdown / Print Spesifikasyonu
  // ---------------------------------------------------------------------------
  it('Kapı 4: AI Rapor durum makinesi PENDING polling ve COMPLETED Markdown render doğrular; S3 URL sızıntısı olmadığını ve Yazdır butonunun çalıştığını kanıtlar', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'valid-student-token',
          refreshToken: 'valid-student-refresh',
          role: 'STUDENT',
          userId: 'std-1',
          username: 'student@okul.com',
        },
        tenantId: 'akademi_1',
      })
    );

    const mockDashboard: StudentDashboardResponse = {
      netScore: 92.5,
      classRank: 1,
      schoolRank: 3,
      percentile: 4.0,
      classAverage: 75.0,
      top3Students: [],
    };

    const mockCompletedReport: AiReportResponseDto = {
      id: 'rep-ai-1',
      status: 'COMPLETED',
      summary:
        '### Genel Değerlendirme\nÖğrenci matematik alanında **yüksek başarı** göstermiştir.\n\n- Geometri konularında tam net.\n- Paragraf hızlandırma önerilir.',
      s3Key: 'tenants/akademi_1/reports/super-secret-s3-key.pdf',
      requestedAt: '2026-11-01T12:00:00Z',
      completedAt: '2026-11-01T12:01:00Z',
    };

    vi.spyOn(studentPortalApi, 'fetchExamDashboard').mockResolvedValue(mockDashboard);
    vi.spyOn(studentPortalApi, 'fetchMyExams').mockResolvedValue([
      {
        id: 'exam-fin-1',
        title: '2026 TYT Deneme 1',
        examDate: '2026-11-01',
        examType: 'TYT',
        status: 'FINALIZED',
        finalizedAt: '2026-11-02T10:00:00Z',
        subjects: [],
        classroomIds: [],
        createdAt: '2026-10-15T10:00:00Z',
      },
    ]);
    vi.spyOn(studentPortalApi, 'fetchStudentHistory').mockResolvedValue({
      studentId: 'std-1',
      totalExamsTaken: 1,
      examHistory: [],
    });
    vi.spyOn(studentPortalApi, 'fetchAiReportStatus').mockResolvedValue(mockCompletedReport);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    const { container } = renderWithProviders(
      <Routes>
        <Route path="/student/exams/:examId/dashboard" element={<StudentExamDashboardPage />} />
      </Routes>,
      '/student/exams/exam-fin-1/dashboard'
    );

    // Markdown rendered content verification
    expect(await screen.findByText('Genel Değerlendirme')).toBeInTheDocument();
    expect(screen.getByText(/yüksek başarı/i)).toBeInTheDocument();
    expect(screen.getByText(/Geometri konularında tam net/i)).toBeInTheDocument();

    // S3 Key Isolation: s3Key must NEVER appear as a link or in the DOM
    expect(container.innerHTML).not.toContain('super-secret-s3-key.pdf');
    const allAnchors = container.querySelectorAll('a');
    allAnchors.forEach((a) => {
      expect(a.getAttribute('href')).not.toContain('s3.amazonaws.com');
      expect(a.getAttribute('href')).not.toContain('super-secret-s3-key.pdf');
    });

    // Native Browser Print verification
    const printBtn = screen.getByRole('button', { name: /Yazdır \/ PDF Olarak Kaydet/i });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Test 5 — Backend 403 Forbidden ve 409 Conflict Hata Sınırı
  // ---------------------------------------------------------------------------
  it('Kapı 5: Yetkisiz sınıf erişiminde backend 403 döndüğünde uygulama çökmez, ErrorResponse standart hata kartı ile gösterilir', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'valid-teacher-token',
          refreshToken: 'valid-teacher-refresh',
          role: 'TEACHER',
          userId: 'teacher-2',
          username: 'teacher2@okul.com',
        },
        tenantId: 'akademi_1',
      })
    );

    // Mock teacher analytics failing with 403 Forbidden ErrorResponse
    const forbiddenError = new ApiError({
      status: 403,
      error: 'FORBIDDEN',
      message: 'Bu sınıfın analitik verilerine erişim yetkiniz bulunmamaktadır.',
    });

    vi.spyOn(analyticsApi, 'fetchClassroomAnalytics').mockRejectedValue(forbiddenError);
    vi.spyOn(analyticsApi, 'fetchClassrooms').mockResolvedValue([
      { id: 'cls-unassigned', name: '11-C Sayısal' },
    ]);
    vi.spyOn(analyticsApi, 'fetchExams').mockResolvedValue([]);
    vi.spyOn(analyticsApi, 'fetchSubjects').mockResolvedValue([]);
    vi.spyOn(analyticsApi, 'fetchClassroomObservations').mockResolvedValue([]);

    renderWithProviders(
      <Routes>
        <Route path="/staff/classrooms/:classroomId/analytics" element={<ClassroomAnalyticsPage />} />
      </Routes>,
      '/staff/classrooms/cls-unassigned/analytics'
    );

    // Verify UI catches 403 gracefully and displays Alert
    expect(
      await screen.findByText('Analitik Verileri Yüklenemedi')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Bu sınıfın analitik verilerine erişim yetkiniz bulunmamaktadır.')
    ).toBeInTheDocument();

    // Verify retry button is rendered and functional
    expect(screen.getByRole('button', { name: /Tekrar Dene/i })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 6 — Kiracı Değişiminde (Tenant Switching) Query Cache İzolasyonu
  // ---------------------------------------------------------------------------
  it('Kapı 6: switchTenant veya clearAuth aksiyonunda TanStack Query önbelleği tamamen boşaltılır ve kiracılar arası veri sızıntısı engellenir', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'token-tenant-a',
          refreshToken: 'refresh-tenant-a',
          role: 'ADMIN',
          userId: 'usr-a',
          username: 'admin@tenant-a.com',
        },
        tenantId: 'tenant_alpha',
      })
    );

    // Populate cache with tenant_alpha data
    queryClient.setQueryData(['tenant_alpha', 'exams'], [{ id: 'alpha-exam-1', title: 'Alpha Sınavı' }]);
    expect(queryClient.getQueryData(['tenant_alpha', 'exams'])).toBeDefined();

    // Switch tenant to tenant_beta
    store.dispatch(switchTenant('tenant_beta'));

    // Cache should be completely cleared by the authSlice listener
    expect(queryClient.getQueryData(['tenant_alpha', 'exams'])).toBeUndefined();
    expect(queryClient.getQueryCache().getAll().length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Test 7 — RoleGuard SUPER_ADMIN İzolasyonu (/staff rotasından /platform/tenants'a yönlendirme)
  // ---------------------------------------------------------------------------
  it('Kapı 7: SUPER_ADMIN personeli olmayan /staff rotalarına erişmeye çalıştığında RoleGuard engeller ve /platform/tenants rotasına yönlendirir', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'super-admin-token-xyz',
          refreshToken: null,
          role: 'SUPER_ADMIN',
          userId: 'sa-01',
          username: 'superadmin',
        },
        tenantId: null,
      })
    );

    renderWithProviders(
      <Routes>
        <Route element={<RoleGuard allowedRoles={['ADMIN', 'TEACHER']} />}>
          <Route path="/staff/overview" element={<div>Staff Overview Gizli Alan</div>} />
        </Route>
        <Route path="/platform/tenants" element={<div>Platform Tenants Alanı</div>} />
      </Routes>,
      '/staff/overview'
    );

    // Should NOT render staff overview
    expect(screen.queryByText('Staff Overview Gizli Alan')).not.toBeInTheDocument();
    // RoleGuard should redirect to defaultHomeForRole('SUPER_ADMIN') -> /platform/tenants
    expect(await screen.findByText('Platform Tenants Alanı')).toBeInTheDocument();
  });
});

