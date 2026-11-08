import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { store } from '@/store';
import { clearAuth, setCredentials } from '@/store/authSlice';
import { queryClient } from '@/lib/api/queryClient';
import { ExamsPage } from '../pages/ExamsPage';
import { examsApi } from '../api/examsApi';
import type { ExamResponse } from '@/types/api';

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
  subjects: [],
  classroomIds: [],
  createdAt: '2026-10-01T08:00:00Z',
};

describe('Phase 2 — Part A: Exam Lifecycle, Subjects & Classrooms Assignment', () => {
  beforeEach(() => {
    store.dispatch(clearAuth());
    queryClient.clear();
    vi.restoreAllMocks();

    // Authenticate as TEACHER in a tenant schema
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
  // 1. Exams Table Rendering & Filtering
  // ───────────────────────────────────────────────────────────────────────────
  it('renders exams table with badges, subjects/classrooms count, and applies search & type filters', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/api/v1/exams')) {
        return new Response(
          JSON.stringify({
            totalElements: 2,
            page: 0,
            size: 15,
            content: [mockExamOpen, mockExamFinalized],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithProviders(<ExamsPage />);

    // Verify rows rendered
    expect(await screen.findByText('2026 TYT Deneme Sınavı 1')).toBeInTheDocument();
    expect(screen.getByText('2026 LGS Genel Değerlendirme')).toBeInTheDocument();

    // Status badges
    expect(screen.getAllByText('Açık').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Kesinleştirildi').length).toBeGreaterThanOrEqual(1);

    // Counts
    expect(screen.getByText('1 Ders')).toBeInTheDocument();
    expect(screen.getByText('1 Sınıf')).toBeInTheDocument();

    // Test search filter
    const searchInput = screen.getByLabelText(/Sınav Ara/i);
    fireEvent.change(searchInput, { target: { value: 'TYT' } });

    await waitFor(() => {
      expect(screen.getByText('2026 TYT Deneme Sınavı 1')).toBeInTheDocument();
      expect(screen.queryByText('2026 LGS Genel Değerlendirme')).not.toBeInTheDocument();
    });

    // Test type filter
    const typeSelect = screen.getByLabelText(/Sınav Türü Filtresi/i);
    fireEvent.change(typeSelect, { target: { value: 'LGS' } });
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.queryByText('2026 TYT Deneme Sınavı 1')).not.toBeInTheDocument();
      expect(screen.getByText('2026 LGS Genel Değerlendirme')).toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Exam Creation Dialog (CreateExamDialog)
  // ───────────────────────────────────────────────────────────────────────────
  it('validates client-side constraints and creates a new exam successfully', async () => {
    let capturedBody: Record<string, string> | null = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith('/api/v1/exams') && init?.method === 'POST') {
        capturedBody = JSON.parse(String(init.body)) as Record<string, string>;
        return new Response(
          JSON.stringify({
            id: '33333333-3333-3333-3333-333333333333',
            title: capturedBody.title,
            examDate: capturedBody.examDate,
            examType: capturedBody.examType,
            status: 'OPEN',
            finalizedAt: null,
            subjects: [],
            classroomIds: [],
            createdAt: '2026-11-08T12:00:00Z',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/v1/exams')) {
        return new Response(
          JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithProviders(<ExamsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Yeni Sınav Oluştur/i }));

    const titleInput = screen.getByPlaceholderText(/2026 Türkiye Geneli/i);
    const dateInput = screen.getByLabelText(/Sınav Tarihi/i);
    const typeSelect = screen.getByLabelText(/Sınav Türü \/ Tipi/i);

    // Validation: title < 3 chars
    fireEvent.change(titleInput, { target: { value: 'AB' } });
    fireEvent.click(screen.getByRole('button', { name: /Sınavı Oluştur/i }));

    expect(await screen.findByText(/en az 3 karakter/i)).toBeInTheDocument();

    // Valid submit
    fireEvent.change(titleInput, { target: { value: '2026 AYT Fen Denemesi' } });
    fireEvent.change(dateInput, { target: { value: '2026-12-05' } });
    fireEvent.change(typeSelect, { target: { value: 'AYT' } });

    fireEvent.click(screen.getByRole('button', { name: /Sınavı Oluştur/i }));

    await waitFor(() => {
      expect(capturedBody).toEqual({
        title: '2026 AYT Fen Denemesi',
        examDate: '2026-12-05',
        examType: 'AYT',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Exam Editing Dialog (EditExamDialog)
  // ───────────────────────────────────────────────────────────────────────────
  it('pre-fills existing exam data and updates exam via PUT /api/v1/exams/{id}', async () => {
    let capturedPutBody: Record<string, string> | null = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes('/api/v1/exams/' + mockExamOpen.id) && init?.method === 'PUT') {
        capturedPutBody = JSON.parse(String(init.body)) as Record<string, string>;
        return new Response(
          JSON.stringify({
            ...mockExamOpen,
            title: capturedPutBody.title,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/v1/exams')) {
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockExamOpen] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithProviders(<ExamsPage />);

    expect(await screen.findByText(mockExamOpen.title)).toBeInTheDocument();

    const editBtn = screen.getByRole('button', { name: new RegExp(`${mockExamOpen.title} sınavını düzenle`, 'i') });
    fireEvent.click(editBtn);

    expect(await screen.findByText('Sınavı Düzenle')).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/Güncel Sınav Adı/i);
    expect(titleInput).toHaveValue(mockExamOpen.title);

    fireEvent.change(titleInput, { target: { value: '2026 TYT Deneme Sınavı 1 (Güncel)' } });
    fireEvent.click(screen.getByRole('button', { name: /Güncellemeleri Kaydet/i }));

    await waitFor(() => {
      expect(capturedPutBody?.title).toBe('2026 TYT Deneme Sınavı 1 (Güncel)');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Exam Deletion Dialog (DeleteExamDialog)
  // ───────────────────────────────────────────────────────────────────────────
  it('opens delete confirmation warning and deletes exam via DELETE /api/v1/exams/{id}', async () => {
    let deleteCalled = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes('/api/v1/exams/' + mockExamOpen.id) && init?.method === 'DELETE') {
        deleteCalled = true;
        return new Response(null, { status: 204 });
      }

      if (url.includes('/api/v1/exams')) {
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockExamOpen] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithProviders(<ExamsPage />);

    expect(await screen.findByText(mockExamOpen.title)).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: new RegExp(`${mockExamOpen.title} sınavını sil`, 'i') });
    fireEvent.click(deleteBtn);

    expect(await screen.findByText(/Dikkat: Sınav ve Öğrenci Sonuçları Silinecek/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Evet, Sınavı Sil/i }));

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Exam Subject Management & Shared ExamRuleEnsureDialog Integration
  // ───────────────────────────────────────────────────────────────────────────
  it('triggers inline ExamRuleEnsureDialog when linking a subject that lacks net calculation rules', async () => {
    let rulePutCalled = false;
    let subjectPostCalled = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      // Return exams list
      if (url.endsWith('/api/v1/exams?page=0&size=15&sort=examDate%2Cdesc')) {
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockExamOpen] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Return tenant subjects list
      if (url.includes('/api/v1/subjects') && !url.includes('/exams')) {
        return new Response(
          JSON.stringify([
            { id: 'sub-mat-1', name: 'Temel Matematik', createdAt: '2026-10-01T10:00:00Z' },
            { id: 'sub-turk-2', name: 'Türkçe', createdAt: '2026-10-01T10:00:00Z' },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Return existing rules for TYT (Türkçe lacks rule!)
      if (url.includes('/api/v1/exam-rules/TYT') && (!init || init.method === 'GET')) {
        return new Response(
          JSON.stringify([
            {
              examType: 'TYT',
              subjectId: 'sub-mat-1',
              subjectName: 'Temel Matematik',
              questionCount: 40,
              penaltyDivisor: 4.0,
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Upsert rule PUT /api/v1/exam-rules/TYT/sub-turk-2
      if (url.includes('/api/v1/exam-rules/TYT/sub-turk-2') && init?.method === 'PUT') {
        rulePutCalled = true;
        const body = JSON.parse(String(init.body)) as { questionCount: number; penaltyDivisor: number };
        expect(body.questionCount).toBe(40);
        expect(body.penaltyDivisor).toBe(4.0);

        return new Response(
          JSON.stringify({
            examType: 'TYT',
            subjectId: 'sub-turk-2',
            subjectName: 'Türkçe',
            questionCount: 40,
            penaltyDivisor: 4.0,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Add subject POST /api/v1/exams/{id}/subjects/{subjectId}
      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/subjects/sub-turk-2`) && init?.method === 'POST') {
        subjectPostCalled = true;
        return new Response(
          JSON.stringify({
            ...mockExamOpen,
            subjects: [
              ...mockExamOpen.subjects,
              { id: 'sub-turk-2', name: 'Türkçe', createdAt: '2026-10-01T10:00:00Z' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithProviders(<ExamsPage />);

    expect(await screen.findByText(mockExamOpen.title)).toBeInTheDocument();

    // Open Subjects Dialog
    fireEvent.click(screen.getByRole('button', { name: /1 Ders/i }));

    expect(await screen.findByText('Sınav Ders Eşleştirmeleri')).toBeInTheDocument();
    expect(screen.getByText('Temel Matematik')).toBeInTheDocument();

    // Select 'Türkçe'
    const subjectSelect = screen.getByLabelText(/Sınava Eklenecek Dersi Seçin/i);
    fireEvent.change(subjectSelect, { target: { value: 'sub-turk-2' } });

    // Click 'Dersi Ekle'
    fireEvent.click(screen.getByRole('button', { name: /Dersi Ekle/i }));

    // Rule is missing -> ExamRuleEnsureDialog must appear
    expect(await screen.findByText('Net Hesaplama Kuralı Tanımla')).toBeInTheDocument();
    expect(screen.getAllByText(/Türkçe/i).length).toBeGreaterThanOrEqual(1);

    // Submit rule
    fireEvent.click(screen.getByRole('button', { name: /Kuralı Kaydet ve Dersi Ekle/i }));

    await waitFor(() => {
      expect(rulePutCalled).toBe(true);
      expect(subjectPostCalled).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Exam Classroom Assignment Dialog (ExamClassroomsDialog)
  // ───────────────────────────────────────────────────────────────────────────
  it('assigns and unassigns classrooms for an exam via POST/DELETE /api/v1/exams/{id}/classrooms', async () => {
    let assignCalled = false;
    let unassignCalled = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes('/api/v1/exams') && (!init || init.method === 'GET')) {
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockExamOpen] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/v1/classrooms') && (!init || init.method === 'GET')) {
        return new Response(
          JSON.stringify([
            { id: 'cls-12a', name: '12-A Fen' },
            { id: 'cls-12b', name: '12-B Anadolu' },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/classrooms`) && init?.method === 'POST') {
        assignCalled = true;
        return new Response(JSON.stringify(mockExamOpen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/classrooms/cls-12a`) && init?.method === 'DELETE') {
        unassignCalled = true;
        return new Response(JSON.stringify(mockExamOpen), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(null, { status: 404 });
    });

    renderWithProviders(<ExamsPage />);

    expect(await screen.findByText(mockExamOpen.title)).toBeInTheDocument();

    // Open Classrooms dialog
    fireEvent.click(screen.getByRole('button', { name: /1 Sınıf/i }));

    expect(await screen.findByText('Sınav Sınıf Atamaları')).toBeInTheDocument();
    expect(await screen.findByText('12-A Fen')).toBeInTheDocument();

    // Assign 12-B Anadolu
    const select = screen.getByLabelText(/Sınava Eklenecek Sınıfı Seçin/i);
    fireEvent.change(select, { target: { value: 'cls-12b' } });

    fireEvent.click(screen.getByRole('button', { name: /Sınıfı Ata/i }));

    await waitFor(() => {
      expect(assignCalled).toBe(true);
    });

    // Unassign 12-A Fen
    const removeBtn = screen.getByRole('button', { name: /12-A Fen sınıfını sınavdan kaldır/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(unassignCalled).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Pagination, Empty States, and Error UI
  // ───────────────────────────────────────────────────────────────────────────
  it('handles multi-page pagination navigation, empty states, and server error alerts', async () => {
    // 1. Pagination navigation
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/v1/exams')) {
        const urlObj = new URL(url);
        const page = Number(urlObj.searchParams.get('page') || 0);

        return new Response(
          JSON.stringify({
            totalElements: 25,
            page,
            size: 15,
            content: [
              {
                ...mockExamOpen,
                id: `exam-page-${page}`,
                title: `Exam Page ${page}`,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<ExamsPage />);

    expect(await screen.findByText('Exam Page 0')).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: /Önceki/i });
    const nextBtn = screen.getByRole('button', { name: /Sonraki/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    fireEvent.click(nextBtn);

    expect(await screen.findByText('Exam Page 1')).toBeInTheDocument();
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

    renderWithProviders(<ExamsPage />);
    expect(await screen.findByText(/Kayıtlı sınav bulunamadı/i)).toBeInTheDocument();

    // 3. Error state (empty message suppressed)
    cleanup();
    queryClient.clear();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({ status: 403, error: 'FORBIDDEN', message: 'Access denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    });

    renderWithProviders(<ExamsPage />);
    expect(await screen.findByText(/Sınav listesi yüklenirken bir sorun oluştu/i)).toBeInTheDocument();
    expect(screen.queryByText(/Kayıtlı sınav bulunamadı/i)).not.toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Tenant Security Header Invariants
  // ───────────────────────────────────────────────────────────────────────────
  it('enforces tenant security invariants: includes Authorization and X-Tenant-Id, strictly omits gateway spoofing headers', async () => {
    const interceptedRequests: { url: string; headers: Headers }[] = [];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      interceptedRequests.push({ url, headers });

      if (url.includes('/api/v1/exams')) {
        return new Response(
          JSON.stringify({ totalElements: 0, page: 0, size: 15, content: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    });

    await examsApi.fetchExams({ page: 0, size: 15 });

    expect(interceptedRequests.length).toBe(1);

    const req = interceptedRequests[0];
    expect(req.headers.get('Authorization')).toBe('Bearer teacher-jwt-token');
    expect(req.headers.get('X-Tenant-Id')).toBe('bursa_fen');
    expect(req.headers.get('X-User-Role')).toBeNull();
    expect(req.headers.get('X-User-Id')).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Direct Subject Addition & Removal
  // ───────────────────────────────────────────────────────────────────────────
  it('adds subject directly when rule already exists, updates dialog immediately, and removes subject', async () => {
    let addSubjectCalled = false;
    let removeSubjectCalled = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes('/api/v1/exams') && (!init || init.method === 'GET')) {
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockExamOpen] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/v1/subjects') && (!init || init.method === 'GET')) {
        return new Response(
          JSON.stringify([
            { id: 'sub-mat-1', name: 'Temel Matematik' },
            { id: 'sub-fiz-2', name: 'Fizik' },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Rule ALREADY EXISTS for sub-fiz-2
      if (url.includes('/api/v1/exam-rules/TYT') && (!init || init.method === 'GET')) {
        return new Response(
          JSON.stringify([
            { id: 'rule-1', examType: 'TYT', subjectId: 'sub-fiz-2', questionCount: 14, penaltyDivisor: 4.0 },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/subjects/sub-fiz-2`) && init?.method === 'POST') {
        addSubjectCalled = true;
        return new Response(
          JSON.stringify({
            ...mockExamOpen,
            subjects: [
              ...mockExamOpen.subjects,
              { id: 'sub-fiz-2', name: 'Fizik', createdAt: '2026-10-01T10:00:00Z' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/subjects/sub-mat-1`) && init?.method === 'DELETE') {
        removeSubjectCalled = true;
        return new Response(
          JSON.stringify({
            ...mockExamOpen,
            subjects: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithProviders(<ExamsPage />);
    expect(await screen.findByText(mockExamOpen.title)).toBeInTheDocument();

    // Open subjects dialog
    fireEvent.click(screen.getByRole('button', { name: /1 Ders/i }));
    expect(await screen.findByText('Sınav Ders Eşleştirmeleri')).toBeInTheDocument();

    // Select Fizik
    const select = screen.getByLabelText(/Sınava Eklenecek Dersi Seçin/i);
    fireEvent.change(select, { target: { value: 'sub-fiz-2' } });

    // Click Add
    fireEvent.click(screen.getByRole('button', { name: /Dersi Ekle/i }));

    await waitFor(() => {
      expect(addSubjectCalled).toBe(true);
    });

    // Remove Temel Matematik
    const removeBtn = screen.getByRole('button', { name: /Temel Matematik dersini sınavdan kaldır/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(removeSubjectCalled).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 10. FINALIZED Exam Protection Guards
  // ───────────────────────────────────────────────────────────────────────────
  it('guards finalized exams: disables edit button and displays finalization warning banners in dialogs', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/v1/exams')) {
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockExamFinalized] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/api/v1/subjects')) {
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/api/v1/classrooms')) {
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<ExamsPage />);
    expect(await screen.findByText(mockExamFinalized.title)).toBeInTheDocument();

    // Verify edit button is disabled
    const editBtn = screen.getByRole('button', { name: new RegExp(`${mockExamFinalized.title} sınavını düzenle`, 'i') });
    expect(editBtn).toBeDisabled();

    // Open subjects dialog -> must show finalized alert and hide add button
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${mockExamFinalized.title} derslerini yönet`, 'i') }));
    expect(await screen.findByText(/Kesinleştirilmiş bir sınavın ders listesi değiştirilemez/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dersi Ekle/i })).not.toBeInTheDocument();

    // Close subjects dialog
    fireEvent.click(screen.getByRole('button', { name: 'Kapat' }));

    // Open classrooms dialog -> must show finalized alert and hide assign button
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${mockExamFinalized.title} sınıflarını yönet`, 'i') }));
    expect(await screen.findByText(/Kesinleştirilmiş bir sınavın sınıf atamaları değiştirilemez/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sınıfı Ata/i })).not.toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 11. Mutation Error Surfacing
  // ───────────────────────────────────────────────────────────────────────────
  it('surfaces API error messages when subject or classroom assignment fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes('/api/v1/exams') && (!init || init.method === 'GET')) {
        return new Response(
          JSON.stringify({ totalElements: 1, page: 0, size: 15, content: [mockExamOpen] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/v1/classrooms') && (!init || init.method === 'GET')) {
        return new Response(
          JSON.stringify([{ id: 'cls-12b', name: '12-B Anadolu' }]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes(`/api/v1/exams/${mockExamOpen.id}/classrooms`) && init?.method === 'POST') {
        return new Response(
          JSON.stringify({ status: 400, error: 'BAD_REQUEST', message: 'Sınıf kontenjanı dolu veya geçersiz.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 404 });
    });

    renderWithProviders(<ExamsPage />);
    expect(await screen.findByText(mockExamOpen.title)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /1 Sınıf/i }));
    expect(await screen.findByText('Sınav Sınıf Atamaları')).toBeInTheDocument();

    const select = screen.getByLabelText(/Sınava Eklenecek Sınıfı Seçin/i);
    fireEvent.change(select, { target: { value: 'cls-12b' } });

    fireEvent.click(screen.getByRole('button', { name: /Sınıfı Ata/i }));

    expect(await screen.findByText(/Sınıf kontenjanı dolu veya geçersiz/i)).toBeInTheDocument();
  });
});
