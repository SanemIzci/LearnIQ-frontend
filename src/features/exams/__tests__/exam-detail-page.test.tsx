import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store';
import { setCredentials, clearAuth } from '@/store/authSlice';
import { queryClient } from '@/lib/api/queryClient';
import { ExamDetailPage } from '../pages/ExamDetailPage';
import { examsApi } from '../api/examsApi';
import type { ExamResponse, StudentExamResult } from '@/types/api';

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};

HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

const mockExamOpen: ExamResponse = {
  id: '11111111-1111-1111-1111-111111111111',
  title: '2026 TYT Deneme Sınavı 1',
  examDate: '2026-11-20',
  examType: 'TYT',
  status: 'OPEN',
  finalizedAt: null,
  subjects: [
    {
      id: 'sub-mat-1',
      name: 'Temel Matematik',
      createdAt: '2026-10-01T10:00:00Z',
    },
  ],
  classroomIds: ['cls-12a'],
  createdAt: '2026-11-01T10:00:00Z',
};

const mockExamFinalized: ExamResponse = {
  id: '22222222-2222-2222-2222-222222222222',
  title: '2026 LGS Genel Değerlendirme',
  examDate: '2026-10-15',
  examType: 'LGS',
  status: 'FINALIZED',
  finalizedAt: '2026-10-16T15:00:00Z',
  subjects: [
    {
      id: 'sub-mat-1',
      name: 'Matematik',
      createdAt: '2026-10-01T10:00:00Z',
    },
  ],
  classroomIds: ['cls-8a'],
  createdAt: '2026-10-01T08:00:00Z',
};

const mockSubmittedResult: StudentExamResult = {
  id: 'res-sub-1',
  studentId: 'stud-1111-1111-1111-111111111111',
  totalScore: 84.5,
  classRank: null,
  schoolRank: null,
  percentile: null,
  status: 'SUBMITTED',
  entryMethod: 'MANUAL',
  reviewedBy: null,
  reviewedAt: null,
  rejectionReason: null,
  createdAt: '2026-11-05T14:30:00Z',
};

const mockApprovedResult: StudentExamResult = {
  id: 'res-app-2',
  studentId: 'stud-2222-2222-2222-222222222222',
  totalScore: 92.75,
  classRank: 2,
  schoolRank: 5,
  percentile: 98.4,
  status: 'APPROVED',
  entryMethod: 'OCR',
  reviewedBy: 'teacher-uuid-1',
  reviewedAt: '2026-11-06T10:00:00Z',
  rejectionReason: null,
  createdAt: '2026-11-05T12:00:00Z',
};

const mockRejectedResult: StudentExamResult = {
  id: 'res-rej-3',
  studentId: 'stud-3333-3333-3333-333333333333',
  totalScore: 45.0,
  classRank: null,
  schoolRank: null,
  percentile: null,
  status: 'REJECTED',
  entryMethod: 'MANUAL',
  reviewedBy: 'teacher-uuid-1',
  reviewedAt: '2026-11-06T11:00:00Z',
  rejectionReason: 'Optik formda Matematik dersi soru sayısı uyuşmuyor.',
  createdAt: '2026-11-05T13:00:00Z',
};

function renderWithRoute(examId: string) {
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/staff/exams/${examId}`]}>
          <Routes>
            <Route path="/staff/exams/:examId" element={<ExamDetailPage />} />
            <Route path="/staff/exams" element={<div>Sınavlar Listesi</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('Phase 2 — Part B: Exam Detail, Result Review & Finalization Center', () => {
  beforeEach(() => {
    store.dispatch(clearAuth());
    queryClient.clear();
    vi.restoreAllMocks();

    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'teacher-jwt-token',
          refreshToken: 'rot-refresh-token',
          role: 'TEACHER',
          userId: 'teacher-uuid-1',
          username: 'math_teacher',
        },
        tenantId: 'bursa_fen',
      })
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Exam Detail Page Header & Metrics Rendering
  // ───────────────────────────────────────────────────────────────────────────
  it('renders exam detail headers, badges, metrics cards, and action buttons for an OPEN exam', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith(`/api/v1/exams/${mockExamOpen.id}`)) {
        return new Response(JSON.stringify(mockExamOpen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results`)) {
        if (url.includes('status=SUBMITTED')) {
          return new Response(
            JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockSubmittedResult] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (url.includes('status=APPROVED')) {
          return new Response(
            JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockApprovedResult] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (url.includes('status=REJECTED')) {
          return new Response(
            JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(null, { status: 404 });
    });

    renderWithRoute(mockExamOpen.id);

    // Header info
    expect(await screen.findByRole('heading', { name: mockExamOpen.title })).toBeInTheDocument();
    expect(screen.getAllByText('TYT').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Açık')).toBeInTheDocument();
    expect(screen.getByText(/20.11.2026/i)).toBeInTheDocument();

    // Action buttons
    expect(screen.getByRole('button', { name: /Sınavı Kesinleştir/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1 Ders/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1 Sınıf/i })).toBeInTheDocument();

    // Metrics cards
    expect(screen.getByText('İnceleme Bekleyen')).toBeInTheDocument();
    expect(screen.getByText('Onaylanan Sonuçlar')).toBeInTheDocument();
    expect(screen.getByText('Reddedilen Sonuçlar')).toBeInTheDocument();

    // Default tab table row
    expect(await screen.findByText('#stud-111...')).toBeInTheDocument();
    expect(screen.getByText('84.50')).toBeInTheDocument();
    expect(screen.getByText('Manuel Giriş')).toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Tabs Navigation & Results by Status
  // ───────────────────────────────────────────────────────────────────────────
  it('navigates between SUBMITTED, APPROVED, and REJECTED tabs and renders appropriate columns', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith(`/api/v1/exams/${mockExamOpen.id}`)) {
        return new Response(JSON.stringify(mockExamOpen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results`)) {
        if (url.includes('status=SUBMITTED')) {
          return new Response(
            JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockSubmittedResult] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (url.includes('status=APPROVED')) {
          return new Response(
            JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockApprovedResult] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (url.includes('status=REJECTED')) {
          return new Response(
            JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockRejectedResult] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(null, { status: 404 });
    });

    renderWithRoute(mockExamOpen.id);

    // SUBMITTED tab (initial)
    expect(await screen.findByText('#stud-111...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /#stud-111\.\.\. sonucunu onayla/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /#stud-111\.\.\. sonucunu reddet/i })).toBeInTheDocument();

    // Click APPROVED tab
    fireEvent.click(screen.getByRole('tab', { name: /Onaylananlar/i }));
    expect(await screen.findByText('#stud-222...')).toBeInTheDocument();
    expect(screen.getByText('92.75')).toBeInTheDocument();
    expect(screen.getByText('Optik Tarama')).toBeInTheDocument();

    // Click REJECTED tab
    fireEvent.click(screen.getByRole('tab', { name: /Reddedilenler/i }));
    expect(await screen.findByText('#stud-333...')).toBeInTheDocument();
    expect(screen.getByText(/Optik formda Matematik dersi soru sayısı uyuşmuyor/i)).toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Result Approval Flow
  // ───────────────────────────────────────────────────────────────────────────
  it('approves a submitted result via POST /api/v1/exams/{id}/results/{resultId}/approve', async () => {
    let approveCalled = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith(`/api/v1/exams/${mockExamOpen.id}`)) {
        return new Response(JSON.stringify(mockExamOpen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results/${mockSubmittedResult.id}/approve`) && init?.method === 'POST') {
        approveCalled = true;
        return new Response(null, { status: 200 });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results`)) {
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockSubmittedResult] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithRoute(mockExamOpen.id);

    expect(await screen.findByText('#stud-111...')).toBeInTheDocument();

    const approveBtn = screen.getByRole('button', { name: /#stud-111\.\.\. sonucunu onayla/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(approveCalled).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Result Rejection Flow with Client-Side Validation
  // ───────────────────────────────────────────────────────────────────────────
  it('validates rejection reason and submits rejection via POST /api/v1/exams/{id}/results/{resultId}/reject', async () => {
    let rejectionPayload: { reason: string } | null = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith(`/api/v1/exams/${mockExamOpen.id}`)) {
        return new Response(JSON.stringify(mockExamOpen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results/${mockSubmittedResult.id}/reject`) && init?.method === 'POST') {
        rejectionPayload = JSON.parse(String(init.body));
        return new Response(null, { status: 200 });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results`)) {
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockSubmittedResult] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithRoute(mockExamOpen.id);

    expect(await screen.findByText('#stud-111...')).toBeInTheDocument();

    // Open rejection dialog
    const rejectBtn = screen.getByRole('button', { name: /#stud-111\.\.\. sonucunu reddet/i });
    fireEvent.click(rejectBtn);

    expect(await screen.findByText('Sınav Sonucunu Reddet')).toBeInTheDocument();

    const reasonInput = screen.getByLabelText(/Reddetme Gerekçesi/i);

    // Validation failure: reason < 3 chars
    fireEvent.change(reasonInput, { target: { value: 'AB' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerekçeli Reddet/i }));

    expect(await screen.findByText(/en az 3 karakter/i)).toBeInTheDocument();

    // Valid rejection
    fireEvent.change(reasonInput, { target: { value: 'Ders soru sayıları optik form ile uyuşmuyor.' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerekçeli Reddet/i }));

    await waitFor(() => {
      expect(rejectionPayload?.reason).toBe('Ders soru sayıları optik form ile uyuşmuyor.');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Exam Finalization Flow
  // ───────────────────────────────────────────────────────────────────────────
  it('finalizes open exam via POST /api/v1/exams/{id}/finalize and updates UI state', async () => {
    let finalizeCalled = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith(`/api/v1/exams/${mockExamOpen.id}`)) {
        return new Response(
          JSON.stringify(finalizeCalled ? mockExamFinalized : mockExamOpen),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/finalize`) && init?.method === 'POST') {
        finalizeCalled = true;
        return new Response(null, { status: 200 });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results`)) {
        return new Response(
          JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithRoute(mockExamOpen.id);

    expect(await screen.findByRole('button', { name: /Sınavı Kesinleştir/i })).toBeInTheDocument();

    // Open finalize modal
    fireEvent.click(screen.getByRole('button', { name: /Sınavı Kesinleştir/i }));

    expect(await screen.findByText('Kesinleştirme Sürecinde Gerçekleşecek İşlemler:')).toBeInTheDocument();

    // Confirm finalization
    fireEvent.click(screen.getByRole('button', { name: /Evet, Sınavı Kesinleştir/i }));

    await waitFor(() => {
      expect(finalizeCalled).toBe(true);
    });

    // Assert UI transition to finalized state
    expect(await screen.findByText(/Bu sınav kesinleştirilmiştir/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sınavı Kesinleştir/i })).not.toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Finalized Exam Rank & Percentile Rendering
  // ───────────────────────────────────────────────────────────────────────────
  it('displays class rank, school rank, and percentile for approved results when exam is finalized', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith(`/api/v1/exams/${mockExamFinalized.id}`)) {
        return new Response(JSON.stringify(mockExamFinalized), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamFinalized.id}/results`)) {
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockApprovedResult] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithRoute(mockExamFinalized.id);

    // Finalized badge and banner must exist
    expect(await screen.findByText(/Bu sınav kesinleştirilmiştir/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sınavı Kesinleştir/i })).not.toBeInTheDocument();

    // Switch to APPROVED tab
    fireEvent.click(screen.getByRole('tab', { name: /Onaylananlar/i }));

    expect(await screen.findByText('#stud-222...')).toBeInTheDocument();
    expect(screen.getByText('5.')).toBeInTheDocument(); // schoolRank
    expect(screen.getByText('2.')).toBeInTheDocument(); // classRank
    expect(screen.getByText('%98.40')).toBeInTheDocument(); // percentile
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Error Handling on Finalization (e.g. 409 Conflict)
  // ───────────────────────────────────────────────────────────────────────────
  it('surfaces error alert when finalization fails with 409 Conflict', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith(`/api/v1/exams/${mockExamOpen.id}`)) {
        return new Response(JSON.stringify(mockExamOpen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/finalize`) && init?.method === 'POST') {
        return new Response(
          JSON.stringify({ status: 409, error: 'CONFLICT', message: 'Sınav zaten sonlandırılmış.' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results`)) {
        return new Response(
          JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithRoute(mockExamOpen.id);

    fireEvent.click(await screen.findByRole('button', { name: /Sınavı Kesinleştir/i }));
    expect(await screen.findByText('Kesinleştirme Sürecinde Gerçekleşecek İşlemler:')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Evet, Sınavı Kesinleştir/i }));

    expect(await screen.findByText(/Sınav zaten sonlandırılmış/i)).toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Empty States for All Result Tabs
  // ───────────────────────────────────────────────────────────────────────────
  it('displays tab-specific empty state messages when results page is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith(`/api/v1/exams/${mockExamOpen.id}`)) {
        return new Response(JSON.stringify(mockExamOpen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results`)) {
        return new Response(
          JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithRoute(mockExamOpen.id);

    // SUBMITTED empty state
    expect(await screen.findByText('İnceleme bekleyen öğrenci sonucu bulunmamaktadır.')).toBeInTheDocument();

    // APPROVED empty state
    fireEvent.click(screen.getByRole('tab', { name: /Onaylananlar/i }));
    expect(await screen.findByText('Henüz onaylanmış öğrenci sonucu bulunmamaktadır.')).toBeInTheDocument();

    // REJECTED empty state
    fireEvent.click(screen.getByRole('tab', { name: /Reddedilenler/i }));
    expect(await screen.findByText('Reddedilmiş öğrenci sonucu bulunmamaktadır.')).toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Tenant Security Invariants
  // ───────────────────────────────────────────────────────────────────────────
  it('enforces tenant security invariants: Authorization and X-Tenant-Id sent, spoofing headers omitted', async () => {
    const interceptedRequests: { url: string; headers: Headers }[] = [];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      interceptedRequests.push({ url, headers });

      if (url.endsWith(`/api/v1/exams/${mockExamOpen.id}`)) {
        return new Response(JSON.stringify(mockExamOpen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results`)) {
        return new Response(
          JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    await examsApi.fetchExamResults(mockExamOpen.id, { status: 'SUBMITTED', page: 0, size: 15 });

    expect(interceptedRequests.length).toBe(1);

    const req = interceptedRequests[0];
    expect(req.headers.get('Authorization')).toBe('Bearer teacher-jwt-token');
    expect(req.headers.get('X-Tenant-Id')).toBe('bursa_fen');
    expect(req.headers.get('X-User-Role')).toBeNull();
    expect(req.headers.get('X-User-Id')).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 10. Approval & Rejection Failure Paths
  // ───────────────────────────────────────────────────────────────────────────
  it('surfaces error alert when result approval or rejection fails with an API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith(`/api/v1/exams/${mockExamOpen.id}`)) {
        return new Response(JSON.stringify(mockExamOpen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results/${mockSubmittedResult.id}/approve`) && init?.method === 'POST') {
        return new Response(
          JSON.stringify({ status: 403, error: 'FORBIDDEN', message: 'Bu sonucu onaylama yetkiniz bulunmamaktadır.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results`)) {
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockSubmittedResult] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithRoute(mockExamOpen.id);

    expect(await screen.findByText('#stud-111...')).toBeInTheDocument();

    const approveBtn = screen.getByRole('button', { name: /#stud-111\.\.\. sonucunu onayla/i });
    fireEvent.click(approveBtn);

    expect(await screen.findByText(/Bu sonucu onaylama yetkiniz bulunmamaktadır/i)).toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 11. Rejection Failure Path
  // ───────────────────────────────────────────────────────────────────────────
  it('surfaces error alert when result rejection fails with an API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith(`/api/v1/exams/${mockExamOpen.id}`)) {
        return new Response(JSON.stringify(mockExamOpen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results/${mockSubmittedResult.id}/reject`) && init?.method === 'POST') {
        return new Response(
          JSON.stringify({ status: 500, error: 'INTERNAL_SERVER_ERROR', message: 'Sonuç reddedilemedi, veritabanı hatası.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results`)) {
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockSubmittedResult] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithRoute(mockExamOpen.id);

    expect(await screen.findByText('#stud-111...')).toBeInTheDocument();

    const rejectBtn = screen.getByRole('button', { name: /#stud-111\.\.\. sonucunu reddet/i });
    fireEvent.click(rejectBtn);

    expect(await screen.findByText('Sınav Sonucunu Reddet')).toBeInTheDocument();

    const reasonInput = screen.getByLabelText(/Reddetme Gerekçesi/i);
    fireEvent.change(reasonInput, { target: { value: 'Optik formda kayma tespit edildi.' } });

    fireEvent.click(screen.getByRole('button', { name: /Gerekçeli Reddet/i }));

    expect(await screen.findByText(/Sonuç reddedilemedi, veritabanı hatası/i)).toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 12. Results Query Error & Retry Flow (D1)
  // ───────────────────────────────────────────────────────────────────────────
  it('surfaces error row and allows retry when results query fails', async () => {
    let shouldFail = true;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith(`/api/v1/exams/${mockExamOpen.id}`)) {
        return new Response(JSON.stringify(mockExamOpen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results`)) {
        if (shouldFail) {
          return new Response(
            JSON.stringify({ status: 400, error: 'BAD_REQUEST', message: 'Sınav sonuçları listelenemedi.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockSubmittedResult] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithRoute(mockExamOpen.id);

    expect(await screen.findByText(/Sınav sonuçları listelenemedi/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Tekrar Dene/i });
    expect(retryBtn).toBeInTheDocument();

    shouldFail = false;
    fireEvent.click(retryBtn);

    expect(await screen.findByText('#stud-111...')).toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 13. Keyboard Navigation Across Result Status Tabs (R2)
  // ───────────────────────────────────────────────────────────────────────────
  it('supports keyboard navigation across result status tabs (ArrowLeft, ArrowRight)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith(`/api/v1/exams/${mockExamOpen.id}`)) {
        return new Response(JSON.stringify(mockExamOpen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/results`)) {
        return new Response(
          JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithRoute(mockExamOpen.id);

    const tablist = await screen.findByRole('tablist', { name: /Sınav sonuç durumu sekmeleri/i });
    expect(screen.getByRole('tab', { name: /İnceleme Bekleyenler/i })).toHaveAttribute('aria-selected', 'true');

    // ArrowRight -> APPROVED
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Onaylananlar/i })).toHaveAttribute('aria-selected', 'true');

    // ArrowRight -> REJECTED
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Reddedilenler/i })).toHaveAttribute('aria-selected', 'true');

    // ArrowLeft -> APPROVED
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: /Onaylananlar/i })).toHaveAttribute('aria-selected', 'true');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 14. Action Buttons Disabled on Finalized Exam
  // ───────────────────────────────────────────────────────────────────────────
  it('disables approve and reject action buttons when exam is finalized', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith(`/api/v1/exams/${mockExamFinalized.id}`)) {
        return new Response(JSON.stringify(mockExamFinalized), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamFinalized.id}/results`)) {
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockSubmittedResult] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithRoute(mockExamFinalized.id);

    expect(await screen.findByText('#stud-111...')).toBeInTheDocument();

    const approveBtn = screen.getByRole('button', { name: /#stud-111\.\.\. sonucunu onayla/i });
    const rejectBtn = screen.getByRole('button', { name: /#stud-111\.\.\. sonucunu reddet/i });

    expect(approveBtn).toBeDisabled();
    expect(rejectBtn).toBeDisabled();
  });
});
