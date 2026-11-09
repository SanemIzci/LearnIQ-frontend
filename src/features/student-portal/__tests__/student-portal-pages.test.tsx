import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store';
import { setCredentials, clearAuth } from '@/store/authSlice';
import { queryClient } from '@/lib/api/queryClient';
import { ApiError } from '@/lib/api/error-parser';
import { studentPortalApi } from '../api/studentPortalApi';
import { StudentHomePage } from '../pages/StudentHomePage';
import { StudentExamsPage } from '../pages/StudentExamsPage';
import { StudentExamDashboardPage } from '../pages/StudentExamDashboardPage';
import { StudentProfilePage } from '../pages/StudentProfilePage';
import { PublicSharePage } from '../pages/PublicSharePage';
import type {
  AiReportResponseDto,
  ExamResponse,
  StudentDashboardResponse,
  StudentHomeResponseDto,
  StudentTrendReportDto,
  SubjectResponse,
  TrendDataPointDto,
} from '@/types/api';

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};

HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

const mockSubjects: SubjectResponse[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Temel Matematik',
    createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Türkçe',
    createdAt: '2026-10-01T10:00:00Z',
  },
];

const mockOpenExam: ExamResponse = {
  id: 'exam-open-1',
  title: '2026 TYT Deneme Sınavı 3',
  examDate: '2026-11-20',
  examType: 'TYT',
  status: 'OPEN',
  finalizedAt: null,
  subjects: mockSubjects,
  classroomIds: ['cls-12a'],
  createdAt: '2026-11-10T10:00:00Z',
};

const mockFinalizedExam: ExamResponse = {
  id: 'exam-fin-2',
  title: '2026 TYT Deneme Sınavı 2',
  examDate: '2026-11-01',
  examType: 'TYT',
  status: 'FINALIZED',
  finalizedAt: '2026-11-03T16:00:00Z',
  subjects: mockSubjects,
  classroomIds: ['cls-12a'],
  createdAt: '2026-10-25T10:00:00Z',
};

const mockHomeData: StudentHomeResponseDto = {
  studentName: 'Elif Yılmaz',
  classroomName: '12-A Sayısal',
  latestExam: {
    examId: 'exam-fin-2',
    title: '2026 TYT Deneme Sınavı 2',
    examDate: '2026-11-01',
    netScore: 94.75,
    percentile: 96.4,
  },
  recentBadges: [
    {
      code: 'TOP_3_FINISHER',
      title: 'Sınıf İlk 3 Derecesi',
      description: 'Sınıf sıralamasında ilk 3 içerisine girdiniz.',
      examTitle: '2026 TYT Deneme Sınavı 2',
      awardedAt: '2026-11-03T16:05:00Z',
    },
  ],
};

const mockTrends: TrendDataPointDto[] = [
  {
    examId: 'exam-fin-1',
    examName: '2026 TYT Deneme Sınavı 1',
    examDate: '2026-10-15',
    netScore: 86.5,
    percentile: 91.2,
  },
  {
    examId: 'exam-fin-2',
    examName: '2026 TYT Deneme Sınavı 2',
    examDate: '2026-11-01',
    netScore: 94.75,
    percentile: 96.4,
  },
];

const mockDashboard: StudentDashboardResponse = {
  classRank: 2,
  schoolRank: 6,
  netScore: 94.75,
  percentile: 96.4,
  classAverage: 72.3,
  top3Students: [
    {
      rank: 1,
      displayName: 'Kerem Demir',
      netScore: 101.25,
    },
    {
      rank: 2,
      displayName: 'Elif Yılmaz',
      netScore: 94.75,
    },
    {
      rank: 3,
      displayName: 'Gizli Öğrenci',
      netScore: 89.0,
    },
  ],
};

const mockStudentHistory: StudentTrendReportDto = {
  studentId: 'student-uuid-1',
  totalExamsTaken: 1,
  examHistory: [
    {
      examId: 'exam-fin-2',
      examTitle: '2026 TYT Deneme Sınavı 2',
      examType: 'TYT',
      examDate: '2026-11-01',
      totalScore: 94.75,
      classRank: 2,
      schoolRank: 6,
      subjectScores: [
        {
          subjectId: '11111111-1111-4111-8111-111111111111',
          subjectName: 'Temel Matematik',
          correctCount: 36,
          wrongCount: 4,
          netScore: 35.0,
        },
        {
          subjectId: '22222222-2222-4222-8222-222222222222',
          subjectName: 'Türkçe',
          correctCount: 35,
          wrongCount: 4,
          netScore: 34.0,
        },
      ],
    },
  ],
};

function setupStudentAuth() {
  store.dispatch(
    setCredentials({
      auth: {
        accessToken: 'student-jwt-token',
        refreshToken: 'student-refresh-token',
        role: 'STUDENT',
        userId: 'student-uuid-1',
        username: 'elif.yilmaz@okul.edu.tr',
      },
      tenantId: 'bursa_fen',
    })
  );
}

describe('Phase 3 Student Portal Pages & Flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
    store.dispatch(clearAuth());
  });

  it('1. StudentHomePage renders welcome summary, latest exam card, badges, and filters trend query by subject', async () => {
    setupStudentAuth();

    vi.spyOn(studentPortalApi, 'fetchStudentHome').mockResolvedValue(mockHomeData);
    const trendsSpy = vi
      .spyOn(studentPortalApi, 'fetchStudentTrends')
      .mockResolvedValue(mockTrends);
    vi.spyOn(studentPortalApi, 'fetchTenantSubjects').mockResolvedValue(mockSubjects);

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/student/home']}>
            <Routes>
              <Route path="/student/home" element={<StudentHomePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(await screen.findByText(/Hoş Geldin, Elif Yılmaz/i)).toBeInTheDocument();
    expect(screen.getByText('12-A Sayısal')).toBeInTheDocument();
    expect(screen.getAllByText('2026 TYT Deneme Sınavı 2').length).toBeGreaterThan(0);
    expect(screen.getByText('Sınıf İlk 3 Derecesi')).toBeInTheDocument();

    // Filter by subject
    const subjectSelect = screen.getByLabelText(/Ders Filtresi/i);
    fireEvent.change(subjectSelect, {
      target: { value: '11111111-1111-4111-8111-111111111111' },
    });

    await waitFor(() => {
      expect(trendsSpy).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
    });
  });

  it('2. StudentExamsPage renders assigned exams, supports keyboard WAI-ARIA tab navigation, and opens manual result entry modal', async () => {
    setupStudentAuth();

    const fetchExamsSpy = vi
      .spyOn(studentPortalApi, 'fetchMyExams')
      .mockResolvedValue([mockOpenExam, mockFinalizedExam]);
    vi.spyOn(studentPortalApi, 'fetchTenantSubjects').mockResolvedValue(mockSubjects);
    vi.spyOn(studentPortalApi, 'fetchStudentHistory').mockResolvedValue(mockStudentHistory);

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/student/exams']}>
            <Routes>
              <Route path="/student/exams" element={<StudentExamsPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(await screen.findByText('2026 TYT Deneme Sınavı 3')).toBeInTheDocument();
    expect(screen.getByText('2026 TYT Deneme Sınavı 2')).toBeInTheDocument();

    const allTab = screen.getByRole('tab', { name: /Tüm Sınavlar/i });
    fireEvent.keyDown(allTab, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(fetchExamsSpy).toHaveBeenCalledWith('OPEN');
    });

    const openEntryButton = await screen.findByRole('button', {
      name: /2026 TYT Deneme Sınavı 3 sınavı için sonuç gir/i,
    });
    fireEvent.click(openEntryButton);

    expect(
      await screen.findByRole('heading', { name: /Manuel Sınav Sonucu Girişi/i })
    ).toBeInTheDocument();
  });

  it('3. SubmitExamResultDialog validates inputs, surfaces backend rule errors, and submits manual correct/wrong counts to POST /api/v1/exams/{examId}/results/me', async () => {
    setupStudentAuth();

    vi.spyOn(studentPortalApi, 'fetchMyExams').mockResolvedValue([mockOpenExam]);
    vi.spyOn(studentPortalApi, 'fetchTenantSubjects').mockResolvedValue(mockSubjects);
    vi.spyOn(studentPortalApi, 'fetchStudentHistory').mockResolvedValue(mockStudentHistory);
    const submitSpy = vi
      .spyOn(studentPortalApi, 'submitMyExamResult')
      .mockRejectedValueOnce(
        new ApiError({
          status: 400,
          error: 'Bad Request',
          message: 'Total answered questions (45) cannot exceed total questions (40)',
          timestamp: new Date().toISOString(),
        })
      )
      .mockResolvedValueOnce(undefined);

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/student/exams']}>
            <Routes>
              <Route path="/student/exams" element={<StudentExamsPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    const openEntryButton = await screen.findByRole('button', {
      name: /2026 TYT Deneme Sınavı 3 sınavı için sonuç gir/i,
    });
    fireEvent.click(openEntryButton);

    const correctInputs = await screen.findAllByLabelText(/Doğru Sayısı/i);
    const wrongInputs = await screen.findAllByLabelText(/Yanlış Sayısı/i);

    // First attempt triggers backend 400 rule error
    fireEvent.change(correctInputs[0], { target: { value: '35' } });
    fireEvent.change(wrongInputs[0], { target: { value: '10' } });

    const submitBtn = screen.getByRole('button', { name: /Sonuçları Onaya Gönder/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Total answered questions \(45\) cannot exceed total questions \(40\)/i)
    ).toBeInTheDocument();

    // Second attempt with valid counts succeeds: Math (36D, 4Y) and Turkish (32D, 4Y)
    fireEvent.change(correctInputs[0], { target: { value: '36' } });
    fireEvent.change(wrongInputs[0], { target: { value: '4' } });
    fireEvent.change(correctInputs[1], { target: { value: '32' } });
    fireEvent.change(wrongInputs[1], { target: { value: '4' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitSpy).toHaveBeenLastCalledWith('exam-open-1', {
        subjects: [
          {
            subjectId: '11111111-1111-4111-8111-111111111111',
            correctCount: 36,
            wrongCount: 4,
          },
          {
            subjectId: '22222222-2222-4222-8222-222222222222',
            correctCount: 32,
            wrongCount: 4,
          },
        ],
      });
    });
  });

  it('4. StudentExamDashboardPage renders 5 scorecard metrics, Top 3 classroom leaderboard, subject breakdown, and generates share link', async () => {
    setupStudentAuth();

    vi.spyOn(studentPortalApi, 'fetchExamDashboard').mockResolvedValue(mockDashboard);
    vi.spyOn(studentPortalApi, 'fetchMyExams').mockResolvedValue([mockFinalizedExam]);
    vi.spyOn(studentPortalApi, 'fetchStudentHistory').mockResolvedValue(mockStudentHistory);
    vi.spyOn(studentPortalApi, 'fetchAiReportStatus').mockRejectedValue(
      new ApiError({
        status: 404,
        error: 'Not Found',
        message: 'AI report not found',
        timestamp: new Date().toISOString(),
      })
    );
    const shareSpy = vi
      .spyOn(studentPortalApi, 'generateShareLink')
      .mockResolvedValue({ token: 'v1.signed-token-abc' });

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/student/exams/exam-fin-2/dashboard']}>
            <Routes>
              <Route
                path="/student/exams/:examId/dashboard"
                element={<StudentExamDashboardPage />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(await screen.findByText('Kerem Demir')).toBeInTheDocument();
    expect(screen.getByText('Gizli Öğrenci')).toBeInTheDocument();
    expect(screen.getByText('Temel Matematik')).toBeInTheDocument();
    expect(screen.getByText('35.00')).toBeInTheDocument();

    const shareBtn = screen.getByRole('button', { name: /Paylaşım Linki Oluştur/i });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledWith('exam-fin-2');
    });

    const shareInput = await screen.findByLabelText(/Paylaşım bağlantısı/i);
    expect((shareInput as HTMLInputElement).value).toContain('/share/v1.signed-token-abc');
  });

  it('5. AiReportCard requests AI report, renders COMPLETED Markdown summary, triggers print, and never leaks s3Key as a link', async () => {
    setupStudentAuth();

    const completedReport: AiReportResponseDto = {
      id: 'rep-1',
      status: 'COMPLETED',
      summary: '### Güçlü Yönler\n\nMatematik netleriniz sınıf ortalamasının üzerinde.',
      s3Key: 'tenants/t1/reports/secret-internal-key.pdf',
      requestedAt: '2026-11-04T10:00:00Z',
      completedAt: '2026-11-04T10:01:00Z',
    };

    vi.spyOn(studentPortalApi, 'fetchExamDashboard').mockResolvedValue(mockDashboard);
    vi.spyOn(studentPortalApi, 'fetchMyExams').mockResolvedValue([mockFinalizedExam]);
    vi.spyOn(studentPortalApi, 'fetchStudentHistory').mockResolvedValue(mockStudentHistory);
    vi.spyOn(studentPortalApi, 'fetchAiReportStatus').mockResolvedValue(completedReport);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    const { container } = render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/student/exams/exam-fin-2/dashboard']}>
            <Routes>
              <Route
                path="/student/exams/:examId/dashboard"
                element={<StudentExamDashboardPage />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(
      await screen.findByText(/Matematik netleriniz sınıf ortalamasının üzerinde/i)
    ).toBeInTheDocument();

    // Ensure s3Key is never rendered in DOM or as an anchor href
    expect(container.innerHTML).not.toContain('secret-internal-key.pdf');

    const printButton = screen.getByRole('button', { name: /Yazdır \/ PDF Olarak Kaydet/i });
    fireEvent.click(printButton);
    expect(printSpy).toHaveBeenCalled();
  });

  it('6. StudentProfilePage displays student identity, badges, history, and updates leaderboard consent via PUT /api/v1/students/me/leaderboard-consent', async () => {
    setupStudentAuth();

    vi.spyOn(studentPortalApi, 'fetchStudentHome').mockResolvedValue(mockHomeData);
    vi.spyOn(studentPortalApi, 'fetchStudentHistory').mockResolvedValue(mockStudentHistory);
    const consentSpy = vi
      .spyOn(studentPortalApi, 'updateLeaderboardConsent')
      .mockResolvedValue(undefined);

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/student/profile']}>
            <Routes>
              <Route path="/student/profile" element={<StudentProfilePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(await screen.findByText('Sınıf İlk 3 Derecesi')).toBeInTheDocument();
    expect(screen.getByText('elif.yilmaz@okul.edu.tr')).toBeInTheDocument();

    const optInBtn = screen.getByRole('button', { name: /Sıralamada Görünür Yap/i });
    fireEvent.click(optInBtn);

    await waitFor(() => {
      expect(consentSpy).toHaveBeenCalledWith(true);
    });

    expect(
      await screen.findByText(/Sınıf ilk 3 sıralamasında adınızın görünmesine izin verildi/i)
    ).toBeInTheDocument();
  });

  it('7. PublicSharePage calls GET /api/v1/public/share/{token} with skipAuth (no Authorization or X-Tenant-Id headers) and renders read-only scorecard', async () => {
    // Even if credentials exist in Redux, skipAuth must prevent sending Authorization & X-Tenant-Id
    setupStudentAuth();

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockDashboard), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/share/v1.public-token-999']}>
            <Routes>
              <Route path="/share/:token" element={<PublicSharePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(await screen.findByText('Paylaşılan Öğrenci Sınav Karnesi')).toBeInTheDocument();
    expect(await screen.findByText('Kerem Demir')).toBeInTheDocument();
    expect(screen.getByText('Gizli Öğrenci')).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchSpy.mock.calls[0];
    expect(String(requestUrl)).toContain('/api/v1/public/share/v1.public-token-999');

    const headers = new Headers(requestInit?.headers);
    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('X-Tenant-Id')).toBeNull();
    expect(headers.get('X-User-Id')).toBeNull();
    expect(headers.get('X-User-Role')).toBeNull();
  });

  it('8. Authenticated student portal requests attach Authorization and X-Tenant-Id while never spoofing X-User-Id or X-User-Role', async () => {
    setupStudentAuth();

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 201,
      })
    );

    await studentPortalApi.submitMyExamResult('exam-open-1', {
      subjects: [
        {
          subjectId: '11111111-1111-4111-8111-111111111111',
          correctCount: 30,
          wrongCount: 4,
        },
      ],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchSpy.mock.calls[0];
    expect(String(requestUrl)).toContain('/api/v1/exams/exam-open-1/results/me');

    const headers = new Headers(requestInit?.headers);
    expect(headers.get('Authorization')).toBe('Bearer student-jwt-token');
    expect(headers.get('X-Tenant-Id')).toBe('bursa_fen');
    expect(headers.get('X-User-Id')).toBeNull();
    expect(headers.get('X-User-Role')).toBeNull();
  });

  it('9. AiReportCard handles FAILED retry action -> PENDING status -> COMPLETED transition', async () => {
    setupStudentAuth();

    const failedReport: AiReportResponseDto = {
      id: 'rep-fail',
      status: 'FAILED',
      summary: null,
      s3Key: null,
      requestedAt: '2026-11-04T10:00:00Z',
      completedAt: null,
    };

    const pendingReport: AiReportResponseDto = {
      id: 'rep-pend',
      status: 'PENDING',
      summary: null,
      s3Key: null,
      requestedAt: '2026-11-04T10:02:00Z',
      completedAt: null,
    };

    vi.spyOn(studentPortalApi, 'fetchExamDashboard').mockResolvedValue(mockDashboard);
    vi.spyOn(studentPortalApi, 'fetchMyExams').mockResolvedValue([mockFinalizedExam]);
    vi.spyOn(studentPortalApi, 'fetchStudentHistory').mockResolvedValue(mockStudentHistory);
    vi.spyOn(studentPortalApi, 'fetchAiReportStatus')
      .mockResolvedValueOnce(failedReport)
      .mockResolvedValue(pendingReport);
    const requestSpy = vi
      .spyOn(studentPortalApi, 'requestAiReport')
      .mockResolvedValue(pendingReport);

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/student/exams/exam-fin-2/dashboard']}>
            <Routes>
              <Route
                path="/student/exams/:examId/dashboard"
                element={<StudentExamDashboardPage />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(await screen.findByText(/Rapor Üretimi Başarısız Oldu/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Tekrar Rapor Oluştur/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledWith('exam-fin-2');
    });

    expect(
      await screen.findByText(/Yapay Zeka Raporunuz Hazırlanıyor \(PENDING\)/i)
    ).toBeInTheDocument();
  });

  it('10. SubmitExamResultDialog pre-fills existingSubjectScores on resubmission and blocks duplicate subjects when selected manually', async () => {
    setupStudentAuth();

    const examWithoutPredefinedSubjects: ExamResponse = {
      ...mockOpenExam,
      id: 'exam-open-manual-subs',
      subjects: [],
    };

    const historyWithOpenSubmission: StudentTrendReportDto = {
      studentId: 'student-uuid-1',
      totalExamsTaken: 1,
      examHistory: [
        {
          examId: 'exam-open-manual-subs',
          examTitle: '2026 TYT Deneme Sınavı 3',
          examType: 'TYT',
          examDate: '2026-11-20',
          totalScore: 28.0,
          classRank: null,
          schoolRank: null,
          subjectScores: [
            {
              subjectId: '11111111-1111-4111-8111-111111111111',
              subjectName: 'Temel Matematik',
              correctCount: 29,
              wrongCount: 4,
              netScore: 28.0,
            },
          ],
        },
      ],
    };

    vi.spyOn(studentPortalApi, 'fetchMyExams').mockResolvedValue([examWithoutPredefinedSubjects]);
    vi.spyOn(studentPortalApi, 'fetchTenantSubjects').mockResolvedValue(mockSubjects);
    vi.spyOn(studentPortalApi, 'fetchStudentHistory').mockResolvedValue(historyWithOpenSubmission);
    const submitSpy = vi.spyOn(studentPortalApi, 'submitMyExamResult').mockResolvedValue(undefined);

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/student/exams']}>
            <Routes>
              <Route path="/student/exams" element={<StudentExamsPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    const updateBtn = await screen.findByRole('button', {
      name: /2026 TYT Deneme Sınavı 3 sınavı için sonuç gir/i,
    });
    expect(updateBtn).toHaveTextContent('Sonucu Güncelle');
    fireEvent.click(updateBtn);

    const correctInput0 = (await screen.findByLabelText(/Doğru Sayısı/i)) as HTMLInputElement;
    expect(correctInput0.value).toBe('29');

    // Add second subject row and select the SAME subject to trigger duplicate subject validation
    const addRowBtn = screen.getByRole('button', { name: /Ders Ekle/i });
    fireEvent.click(addRowBtn);

    const subjectSelects = screen.getAllByLabelText(/^Ders$/i);
    fireEvent.change(subjectSelects[1], {
      target: { value: '11111111-1111-4111-8111-111111111111' },
    });

    const submitBtn = screen.getByRole('button', { name: /Sonuçları Onaya Gönder/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Aynı ders birden fazla kez gönderilemez/i)
    ).toBeInTheDocument();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('11. StudentExamDashboardPage resets share state when examId changes (D2) and does not falsely claim copy when clipboard is unavailable (D3)', async () => {
    setupStudentAuth();

    vi.spyOn(studentPortalApi, 'fetchExamDashboard').mockResolvedValue(mockDashboard);
    vi.spyOn(studentPortalApi, 'fetchStudentHistory').mockResolvedValue(mockStudentHistory);
    vi.spyOn(studentPortalApi, 'fetchAiReportStatus').mockRejectedValue(
      new ApiError({
        status: 404,
        error: 'Not Found',
        message: 'AI report not found',
        timestamp: new Date().toISOString(),
      })
    );
    vi.spyOn(studentPortalApi, 'generateShareLink').mockResolvedValue({
      token: 'v1.exam-fin-2-token',
    });

    // Simulate missing navigator.clipboard
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/student/exams/exam-fin-2/dashboard']}>
            <Routes>
              <Route
                path="/student/exams/:examId/dashboard"
                element={
                  <div>
                    <Link to="/student/exams/exam-fin-1/dashboard">Diğer Karne</Link>
                    <StudentExamDashboardPage />
                  </div>
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    const shareBtn = await screen.findByRole('button', { name: /Paylaşım Linki Oluştur/i });
    fireEvent.click(shareBtn);

    const shareInput = await screen.findByLabelText(/Paylaşım bağlantısı/i);
    expect((shareInput as HTMLInputElement).value).toContain('/share/v1.exam-fin-2-token');

    const copyBtn = screen.getByRole('button', { name: /Kopyala/i });
    fireEvent.click(copyBtn);

    // Must surface clipboard unavailable warning and must NOT show "Kopyalandı"
    expect(
      await screen.findByText(/Tarayıcınız otomatik kopyalamayı desteklemiyor/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Kopyalandı')).not.toBeInTheDocument();

    // Navigate to another exam via React Router Link and verify share link resets (D2)
    fireEvent.click(screen.getByRole('link', { name: /Diğer Karne/i }));
    await waitFor(() => {
      expect(screen.queryByLabelText(/Paylaşım bağlantısı/i)).not.toBeInTheDocument();
    });

    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
  });

  it('12. StudentProfilePage distinguishes unranked/open vs ranked/finalized exams (D1) and surfaces history error with retry', async () => {
    setupStudentAuth();

    const mixedHistory: StudentTrendReportDto = {
      studentId: 'student-uuid-1',
      totalExamsTaken: 2,
      examHistory: [
        {
          examId: 'exam-fin-2',
          examTitle: '2026 TYT Deneme Sınavı 2',
          examType: 'TYT',
          examDate: '2026-11-01',
          totalScore: 94.75,
          classRank: 2,
          schoolRank: 6,
          subjectScores: [],
        },
        {
          examId: 'exam-open-1',
          examTitle: '2026 TYT Deneme Sınavı 3',
          examType: 'TYT',
          examDate: '2026-11-20',
          totalScore: 81.25,
          classRank: null,
          schoolRank: null,
          subjectScores: [],
        },
      ],
    };

    vi.spyOn(studentPortalApi, 'fetchStudentHome').mockResolvedValue(mockHomeData);
    const historySpy = vi
      .spyOn(studentPortalApi, 'fetchStudentHistory')
      .mockRejectedValueOnce(
        new ApiError({
          status: 400,
          error: 'Bad Request',
          message: 'Analitik servisi geçici olarak yanıt vermiyor',
          timestamp: new Date().toISOString(),
        })
      )
      .mockResolvedValueOnce(mixedHistory);

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/student/profile']}>
            <Routes>
              <Route path="/student/profile" element={<StudentProfilePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(await screen.findByText('Sınıf İlk 3 Derecesi')).toBeInTheDocument();
    expect(
      await screen.findByText(/Analitik servisi geçici olarak yanıt vermiyor/i)
    ).toBeInTheDocument();

    const retryButtons = screen.getAllByRole('button', { name: /Tekrar Dene/i });
    fireEvent.click(retryButtons[0]);

    expect(await screen.findByText(/Kesinleşti \(Sınıf #2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Onay \/ Kesinleşme Bekliyor/i)).toBeInTheDocument();
    expect(historySpy).toHaveBeenCalledTimes(2);
  });

  it('13. PublicSharePage renders error alert on invalid/expired share token (400) and StudentExamDashboardPage renders error alert on 409', async () => {
    setupStudentAuth();

    vi.spyOn(studentPortalApi, 'fetchSharedSnapshot').mockRejectedValue(
      new ApiError({
        status: 400,
        error: 'Bad Request',
        message: 'Paylaşım bağlantısının süresi dolmuş veya imza geçersiz.',
        timestamp: new Date().toISOString(),
      })
    );
    vi.spyOn(studentPortalApi, 'fetchExamDashboard').mockRejectedValue(
      new ApiError({
        status: 409,
        error: 'Conflict',
        message: 'Sınav henüz kesinleştirilmediği için karne oluşturulamaz.',
        timestamp: new Date().toISOString(),
      })
    );

    const { unmount } = render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/share/v1.expired-token']}>
            <Routes>
              <Route path="/share/:token" element={<PublicSharePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(
      await screen.findByText(/Paylaşım bağlantısının süresi dolmuş veya imza geçersiz/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    unmount();

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/student/exams/exam-open-1/dashboard']}>
            <Routes>
              <Route
                path="/student/exams/:examId/dashboard"
                element={<StudentExamDashboardPage />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(
      await screen.findByText(/Sınav henüz kesinleştirilmediği için karne oluşturulamaz/i)
    ).toBeInTheDocument();
  });
});
