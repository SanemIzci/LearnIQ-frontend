import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store';
import { setCredentials, clearAuth } from '@/store/authSlice';
import { queryClient } from '@/lib/api/queryClient';
import { analyticsApi } from '../api/analyticsApi';
import { aiRagApi } from '@/features/ai-rag/api/aiRagApi';
import { OverviewPage } from '../pages/OverviewPage';
import { ClassroomsPage } from '../pages/ClassroomsPage';
import { ClassroomAnalyticsPage } from '../pages/ClassroomAnalyticsPage';
import { StudentAnalyticsPage } from '../pages/StudentAnalyticsPage';
import { AdminAiAssistantPage } from '@/features/ai-rag/pages/AdminAiAssistantPage';
import type {
  AdminChatResponse,
  AdminDashboardResponse,
  ClassroomAnalyticsResponse,
  ClassroomComparisonResponse,
  ClassroomResponse,
  ExamResponse,
  ObservationResponse,
  RagBackfillResponse,
  StudentTrendReportDto,
  SubjectResponse,
  SubjectScorecardResponse,
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

// Mock Data
const mockSubjects: SubjectResponse[] = [
  { id: 'sub-mat', name: 'Temel Matematik', createdAt: '2026-10-01T10:00:00Z' },
  { id: 'sub-turk', name: 'Türkçe', createdAt: '2026-10-01T10:00:00Z' },
];

const mockClassrooms: ClassroomResponse[] = [
  { id: 'cls-12a', name: '12-A Sayısal' },
  { id: 'cls-12b', name: '12-B Eşit Ağırlık' },
];

const mockExams: ExamResponse[] = [
  {
    id: 'exam-1',
    title: '2026 TYT Deneme 1',
    examDate: '2026-10-15',
    examType: 'TYT',
    status: 'FINALIZED',
    finalizedAt: '2026-10-18T10:00:00Z',
    subjects: mockSubjects,
    classroomIds: ['cls-12a', 'cls-12b'],
    createdAt: '2026-10-01T10:00:00Z',
  },
];

const mockAdminDashboard: AdminDashboardResponse = {
  classroomCount: 2,
  classrooms: [
    {
      classroomId: 'cls-12a',
      classroomName: '12-A Sayısal',
      latestExamId: 'exam-1',
      latestExamTitle: '2026 TYT Deneme 1',
      latestExamDate: '2026-10-15',
      avgNet: 82.5,
      participationRate: 95.0,
      bestSubjectName: 'Temel Matematik',
      bestSubjectNet: 31.5,
      worstSubjectName: 'Türkçe',
      worstSubjectNet: 24.0,
      upTrendCount: 3,
      downTrendCount: 1,
      stableTrendCount: 0,
    },
    {
      classroomId: 'cls-12b',
      classroomName: '12-B Eşit Ağırlık',
      latestExamId: 'exam-1',
      latestExamTitle: '2026 TYT Deneme 1',
      latestExamDate: '2026-10-15',
      avgNet: 74.0,
      participationRate: 88.0,
      bestSubjectName: 'Türkçe',
      bestSubjectNet: 32.0,
      worstSubjectName: 'Temel Matematik',
      worstSubjectNet: 18.5,
      upTrendCount: 2,
      downTrendCount: 2,
      stableTrendCount: 0,
    },
  ],
};

const mockSubjectScorecard: SubjectScorecardResponse = {
  examId: 'exam-1',
  subjects: [
    {
      subjectId: 'sub-mat',
      subjectName: 'Temel Matematik',
      classroomCount: 2,
      avgNet: 25.0,
      minNet: 18.5,
      maxNet: 31.5,
      bestClassroomName: '12-A Sayısal',
      worstClassroomName: '12-B Eşit Ağırlık',
    },
    {
      subjectId: 'sub-turk',
      subjectName: 'Türkçe',
      classroomCount: 2,
      avgNet: 28.0,
      minNet: 24.0,
      maxNet: 32.0,
      bestClassroomName: '12-B Eşit Ağırlık',
      worstClassroomName: '12-A Sayısal',
    },
  ],
};

const mockClassroomAnalytics: ClassroomAnalyticsResponse = {
  classroomId: 'cls-12a',
  classroomName: '12-A Sayısal',
  totalStudents: 24,
  analyzedExam: {
    id: 'exam-1',
    title: '2026 TYT Deneme 1',
    examDate: '2026-10-15',
    examType: 'TYT',
  },
  participationCount: 23,
  participationRate: 95.8,
  classAverageScore: 82.5,
  subjectAverages: [
    {
      subjectId: 'sub-mat',
      subjectName: 'Temel Matematik',
      avgNet: 31.5,
      avgCorrect: 33.0,
      avgWrong: 6.0,
    },
    {
      subjectId: 'sub-turk',
      subjectName: 'Türkçe',
      avgNet: 24.0,
      avgCorrect: 26.5,
      avgWrong: 10.0,
    },
  ],
  recentExamTrends: [
    {
      examId: 'exam-1',
      examTitle: '2026 TYT Deneme 1',
      examDate: '2026-10-15',
      avgScore: 82.5,
      studentCount: 23,
    },
  ],
};

const mockObservations: ObservationResponse[] = [
  {
    id: 'obs-1',
    teacherId: 'teacher-1',
    classroomId: 'cls-12a',
    subjectId: 'sub-mat',
    examId: 'exam-1',
    content: 'Problemler konusunda genel başarı yüksek, geometri eksikleri tespit edildi.',
    tags: ['geometri', 'ilerleme'],
    createdAt: '2026-10-20T14:30:00Z',
    updatedAt: '2026-10-20T14:30:00Z',
  },
];

const mockComparison: ClassroomComparisonResponse = {
  examId: 'exam-1',
  examTitle: '2026 TYT Deneme 1',
  examDate: '2026-10-15',
  classrooms: [
    {
      classroomId: 'cls-12a',
      classroomName: '12-A Sayısal',
      totalStudents: 24,
      participationCount: 23,
      avgScore: 82.5,
      subjectNets: [
        {
          subjectId: 'sub-mat',
          subjectName: 'Temel Matematik',
          avgNet: 31.5,
          avgCorrect: 33,
          avgWrong: 6,
        },
        {
          subjectId: 'sub-turk',
          subjectName: 'Türkçe',
          avgNet: 24.0,
          avgCorrect: 26,
          avgWrong: 8,
        },
      ],
    },
    {
      classroomId: 'cls-12b',
      classroomName: '12-B Eşit Ağırlık',
      totalStudents: 25,
      participationCount: 22,
      avgScore: 74.0,
      subjectNets: [
        {
          subjectId: 'sub-mat',
          subjectName: 'Temel Matematik',
          avgNet: 18.5,
          avgCorrect: 20,
          avgWrong: 6,
        },
        {
          subjectId: 'sub-turk',
          subjectName: 'Türkçe',
          avgNet: 32.0,
          avgCorrect: 34,
          avgWrong: 8,
        },
      ],
    },
  ],
};

const mockStudentTrendReport: StudentTrendReportDto = {
  studentId: 'std-101',
  totalExamsTaken: 2,
  examHistory: [
    {
      examId: 'exam-1',
      examTitle: '2026 TYT Deneme 1',
      examType: 'TYT',
      examDate: '2026-10-15',
      totalScore: 89.0,
      classRank: 2,
      schoolRank: 5,
      subjectScores: [
        {
          subjectId: 'sub-mat',
          subjectName: 'Temel Matematik',
          correctCount: 35,
          wrongCount: 4,
          netScore: 34.0,
        },
        {
          subjectId: 'sub-turk',
          subjectName: 'Türkçe',
          correctCount: 28,
          wrongCount: 8,
          netScore: 26.0,
        },
      ],
    },
    {
      examId: 'exam-0',
      examTitle: 'Hazırbulunuşluk Sınavı',
      examType: 'TYT',
      examDate: '2026-09-20',
      totalScore: 80.0,
      classRank: 4,
      schoolRank: 12,
      subjectScores: [
        {
          subjectId: 'sub-mat',
          subjectName: 'Temel Matematik',
          correctCount: 30,
          wrongCount: 8,
          netScore: 28.0,
        },
        {
          subjectId: 'sub-turk',
          subjectName: 'Türkçe',
          correctCount: 31,
          wrongCount: 8,
          netScore: 29.0,
        },
      ],
    },
  ],
};

const mockAdminChatResponse: AdminChatResponse = {
  answer:
    '12-A sınıfının son denemedeki matematik ortalaması **31.5 net** olup kurum genelinin üzerindedir.',
  sources: [
    {
      sourceType: 'CLASSROOM_ANALYSIS',
      sourceId: 'cls-12a',
      similarity: 0.92,
      metadata: {
        classroom: '12-A Sayısal',
        exam: '2026 TYT Deneme 1',
        avgNet: 31.5,
      },
    },
  ],
};

const mockRagBackfillResponse: RagBackfillResponse = {
  candidates: 120,
  updated: 118,
  failed: 2,
};

function renderWithProviders(ui: React.ReactElement, initialPath = '/') {
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('Phase 4: Analytics, Observations, Weaknesses & Admin RAG AI Assistant', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
    store.dispatch(clearAuth());

    // Login as ADMIN by default
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'valid-admin-token',
          refreshToken: 'valid-admin-refresh',
          role: 'ADMIN',
          userId: 'admin-1',
          username: 'admin@okul.com',
        },
        tenantId: 'test_tenant',
      })
    );

    // Default API mocks
    vi.spyOn(analyticsApi, 'fetchAdminDashboard').mockResolvedValue(mockAdminDashboard);
    vi.spyOn(analyticsApi, 'fetchAdminSubjectScorecard').mockResolvedValue(mockSubjectScorecard);
    vi.spyOn(analyticsApi, 'fetchClassrooms').mockResolvedValue(mockClassrooms);
    vi.spyOn(analyticsApi, 'fetchExams').mockResolvedValue(mockExams);
    vi.spyOn(analyticsApi, 'fetchSubjects').mockResolvedValue(mockSubjects);
    vi.spyOn(analyticsApi, 'fetchClassroomAnalytics').mockResolvedValue(mockClassroomAnalytics);
    vi.spyOn(analyticsApi, 'compareClassrooms').mockResolvedValue(mockComparison);
    vi.spyOn(analyticsApi, 'fetchClassroomObservations').mockResolvedValue(mockObservations);
    vi.spyOn(analyticsApi, 'createObservation').mockResolvedValue(mockObservations[0]);
    vi.spyOn(analyticsApi, 'updateObservation').mockResolvedValue(mockObservations[0]);
    vi.spyOn(analyticsApi, 'deleteObservation').mockResolvedValue();
    vi.spyOn(analyticsApi, 'fetchStudentHistory').mockResolvedValue(mockStudentTrendReport);
    vi.spyOn(analyticsApi, 'generateStudentAiReport').mockResolvedValue();
    vi.spyOn(aiRagApi, 'chatWithAi').mockResolvedValue(mockAdminChatResponse);
    vi.spyOn(aiRagApi, 'triggerBackfill').mockResolvedValue(mockRagBackfillResponse);
  });

  // Test 1: OverviewPage for ADMIN
  it('renders OverviewPage with admin KPIs, classroom cards, and subject scorecard', async () => {
    renderWithProviders(<OverviewPage />);

    expect(screen.getByText(/Akademik Genel Bakış & Sınıf Karşılaştırması/i)).toBeInTheDocument();
    expect(screen.getByText('Kurum & Yönetici Analitiği')).toBeInTheDocument();

    // Verify Admin KPI stats
    await waitFor(() => {
      expect(screen.getAllByText('12-A Sayısal').length).toBeGreaterThan(0);
      expect(screen.getAllByText('12-B Eşit Ağırlık').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Ders Performans Karnesi (Tüm Kurum)')).toBeInTheDocument();
    expect(screen.getAllByText('Temel Matematik').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Türkçe').length).toBeGreaterThan(0);
  });

  // Test 2: OverviewPage role isolation - Teacher hides admin scorecard
  it('hides admin-only scorecard when viewed by a TEACHER', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'valid-teacher-token',
          refreshToken: 'valid-teacher-refresh',
          role: 'TEACHER',
          userId: 'teacher-1',
          username: 'teacher@okul.com',
        },
        tenantId: 'test_tenant',
      })
    );

    renderWithProviders(<OverviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Öğretmen Analitik Özeti')).toBeInTheDocument();
    });

    // Scorecard shouldn't be rendered for teachers
    expect(screen.queryByText(/Ders Performans Karnesi/i)).not.toBeInTheDocument();
  });

  // Test 3: ClassroomsPage & Quick Observation Dialog
  it('renders ClassroomsPage and opens observation creation modal', async () => {
    renderWithProviders(<ClassroomsPage />);

    await waitFor(() => {
      expect(screen.getByText('12-A Sayısal')).toBeInTheDocument();
    });

    const addObsButtons = screen.getAllByRole('button', { name: /Gözlem Ekle/i });
    expect(addObsButtons.length).toBeGreaterThan(0);

    fireEvent.click(addObsButtons[0]);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByText('Yeni Öğretmen Gözlem Notu Ekle')).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText(/Gözlem İçeriği/i);
    fireEvent.change(textarea, {
      target: { value: 'Öğrencinin analitik düşünme yeteneği çok güçlü.' },
    });

    const saveBtn = screen.getByRole('button', { name: /Gözlemi Kaydet/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(analyticsApi.createObservation).toHaveBeenCalledWith(
        'cls-12a',
        expect.objectContaining({
          content: 'Öğrencinin analitik düşünme yeteneği çok güçlü.',
        })
      );
    });
  });

  // Test 4: ClassroomAnalyticsPage with KPIs, Subjects Breakdown and Observations CRUD
  it('renders ClassroomAnalyticsPage with KPIs, exam selector, and performs observation CRUD', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/staff/classrooms/:classroomId/analytics" element={<ClassroomAnalyticsPage />} />
      </Routes>,
      '/staff/classrooms/cls-12a/analytics'
    );

    await waitFor(() => {
      expect(screen.getByText(/12-A Sayısal — Başarı ve Katılım Analitiği/i)).toBeInTheDocument();
    });

    // Subject breakdown table
    expect(screen.getByText('Ders Bazlı Doğru, Yanlış ve Net Ortalamaları')).toBeInTheDocument();
    expect(screen.getByText('31.50 Net')).toBeInTheDocument(); // Math net

    // Existing observation check
    expect(screen.getByText(/Problemler konusunda genel başarı yüksek/i)).toBeInTheDocument();

    // Delete observation
    const deleteBtn = screen.getByLabelText('Gözlem notunu sil');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(analyticsApi.deleteObservation).toHaveBeenCalledWith('obs-1');
    });
  });

  // Test 5: StudentAnalyticsPage with Weakness Diagnosis & AI Report Trigger
  it('renders StudentAnalyticsPage, diagnoses subject weaknesses and triggers AI report generation', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/staff/students/:studentId" element={<StudentAnalyticsPage />} />
      </Routes>,
      '/staff/students/std-101'
    );

    await waitFor(() => {
      expect(screen.getByText('Öğrenci Akademik Performans & Zayıflık Analizi')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Ders Güçlü & Geliştirilmesi Gereken Yönler/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Güçlü Dersler/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Geliştirilmesi Gereken Dersler/i).length).toBeGreaterThan(0);

    // Trigger AI report generation
    const generateAiBtn = screen.getByRole('button', { name: /Öğrenci AI Raporu Üret/i });
    fireEvent.click(generateAiBtn);

    await waitFor(() => {
      expect(analyticsApi.generateStudentAiReport).toHaveBeenCalledWith('std-101');
    });
  });

  // Test 6: AdminAiAssistantPage multi-turn chat with filters & Markdown rendering
  it('sends question with contextual filters to Admin AI Assistant and renders Markdown & sources', async () => {
    renderWithProviders(<AdminAiAssistantPage />);

    expect(screen.getByText('Admin RAG AI Asistanı')).toBeInTheDocument();

    // Check sample prompt buttons
    const samplePrompt = screen.getByText(
      '12-A sınıfının son denemedeki matematik net ortalaması ve zayıf konuları nelerdir?'
    );
    fireEvent.click(samplePrompt);

    await waitFor(() => {
      expect(aiRagApi.chatWithAi).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '12-A sınıfının son denemedeki matematik net ortalaması ve zayıf konuları nelerdir?',
        })
      );
    });

    // Check response rendered
    await waitFor(() => {
      expect(screen.getByText(/12-A sınıfının son denemedeki matematik ortalaması/i)).toBeInTheDocument();
      expect(screen.getByText(/RAG Bilgi Bankası Kaynakları & Atıflar/i)).toBeInTheDocument();
    });

    // Expand source citation
    const sourceToggle = screen.getByText(/Kaynak #1: CLASSROOM_ANALYSIS/i);
    fireEvent.click(sourceToggle);

    await waitFor(() => {
      expect(screen.getByText(/"classroom": "12-A Sayısal"/i)).toBeInTheDocument();
    });
  });

  // Test 7: AdminAiAssistantPage Vector Backfill Tool
  it('toggles vector backfill card and triggers RAG re-indexing', async () => {
    renderWithProviders(<AdminAiAssistantPage />);

    const toggleBackfillBtn = screen.getByRole('button', {
      name: /Vektör Senkronizasyonu \(Backfill\)/i,
    });
    fireEvent.click(toggleBackfillBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/RAG Doküman İndeksleme & Vektör Senkronizasyonu \(Backfill\)/i)
      ).toBeInTheDocument();
    });

    const runBtn = screen.getByRole('button', { name: /Vektör İndekslemeyi Başlat/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(aiRagApi.triggerBackfill).toHaveBeenCalledWith(50);
      expect(screen.getByText('118')).toBeInTheDocument(); // updated
    });
  });

  // Test 8: Validates max character limits and prevents empty chat submissions
  it('prevents empty chat submission and enforces 4000 character validation', async () => {
    renderWithProviders(<AdminAiAssistantPage />);

    const sendBtn = screen.getByRole('button', { name: /Soruyu Gönder/i });
    expect(sendBtn).toBeDisabled();

    const textarea = screen.getByLabelText(/Yapay zekaya soru sorun/i);
    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(sendBtn).toBeDisabled();

    // Type valid message
    fireEvent.change(textarea, { target: { value: 'Kurum genelindeki başarı trendi nedir?' } });
    expect(sendBtn).not.toBeDisabled();
  });
});
