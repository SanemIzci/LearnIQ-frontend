import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { useAppSelector } from '@/store';
import type {
  AiReportResponseDto,
  ExamResponse,
  ExamResultSubmitRequest,
  ShareLinkResponse,
  StudentDashboardResponse,
  StudentHomeResponseDto,
  StudentTrendReportDto,
  SubjectResponse,
  TrendDataPointDto,
} from '@/types/api';

export type StudentExamStatusFilter = 'OPEN' | 'FINALIZED' | 'ALL';

function normalizeStudentExam(raw: Partial<ExamResponse> & { id: string; title: string; examDate: string; examType: string }): ExamResponse {
  return {
    id: raw.id,
    title: raw.title,
    examDate: raw.examDate,
    examType: raw.examType,
    status: raw.status ?? 'OPEN',
    finalizedAt: raw.finalizedAt ?? null,
    subjects: Array.isArray(raw.subjects) ? raw.subjects : [],
    classroomIds: Array.isArray(raw.classroomIds) ? raw.classroomIds : [],
    createdAt: raw.createdAt ?? raw.examDate,
  };
}

export const studentPortalApi = {
  fetchStudentHome: async (): Promise<StudentHomeResponseDto> => {
    return apiClient.get<StudentHomeResponseDto>('/api/v1/students/me/home');
  },

  fetchStudentTrends: async (subjectId?: string): Promise<TrendDataPointDto[]> => {
    const query = new URLSearchParams();
    if (subjectId) {
      query.set('subjectId', subjectId);
    }
    const qs = query.toString();
    return apiClient.get<TrendDataPointDto[]>(
      `/api/v1/students/me/trends${qs ? `?${qs}` : ''}`
    );
  },

  fetchMyExams: async (status: StudentExamStatusFilter = 'ALL'): Promise<ExamResponse[]> => {
    const query = new URLSearchParams();
    if (status) {
      query.set('status', status);
    }
    const raw = await apiClient.get<ExamResponse[]>(
      `/api/v1/students/me/exams?${query.toString()}`
    );
    return Array.isArray(raw) ? raw.map(normalizeStudentExam) : [];
  },

  fetchTenantSubjects: async (): Promise<SubjectResponse[]> => {
    return apiClient.get<SubjectResponse[]>('/api/v1/subjects');
  },

  submitMyExamResult: async (
    examId: string,
    payload: ExamResultSubmitRequest
  ): Promise<void> => {
    await apiClient.post<void>(
      `/api/v1/exams/${encodeURIComponent(examId)}/results/me`,
      payload
    );
  },

  fetchExamDashboard: async (examId: string): Promise<StudentDashboardResponse> => {
    return apiClient.get<StudentDashboardResponse>(
      `/api/v1/students/me/exams/${encodeURIComponent(examId)}/dashboard`
    );
  },

  requestAiReport: async (examId: string): Promise<AiReportResponseDto> => {
    return apiClient.post<AiReportResponseDto>(
      `/api/v1/students/me/exams/${encodeURIComponent(examId)}/ai-report`
    );
  },

  fetchAiReportStatus: async (examId: string): Promise<AiReportResponseDto> => {
    return apiClient.get<AiReportResponseDto>(
      `/api/v1/students/me/exams/${encodeURIComponent(examId)}/ai-report`
    );
  },

  generateShareLink: async (examId: string): Promise<ShareLinkResponse> => {
    return apiClient.post<ShareLinkResponse>(
      `/api/v1/students/me/exams/${encodeURIComponent(examId)}/share`
    );
  },

  updateLeaderboardConsent: async (consent: boolean): Promise<void> => {
    await apiClient.put<void>(
      `/api/v1/students/me/leaderboard-consent?consent=${encodeURIComponent(String(consent))}`
    );
  },

  fetchStudentHistory: async (studentId: string): Promise<StudentTrendReportDto> => {
    return apiClient.get<StudentTrendReportDto>(
      `/api/v1/analytics/students/${encodeURIComponent(studentId)}/history`
    );
  },

  fetchSharedSnapshot: async (token: string): Promise<StudentDashboardResponse> => {
    return apiClient.get<StudentDashboardResponse>(
      `/api/v1/public/share/${encodeURIComponent(token)}`,
      { skipAuth: true }
    );
  },
};

export function useStudentHomeQuery() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'student-home'),
    queryFn: () => studentPortalApi.fetchStudentHome(),
    enabled: Boolean(tenantId),
  });
}

export function useStudentTrendsQuery(subjectId?: string) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const normalizedSubjectId = subjectId || 'OVERALL';

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'student-trends', normalizedSubjectId),
    queryFn: () => studentPortalApi.fetchStudentTrends(subjectId || undefined),
    enabled: Boolean(tenantId),
  });
}

export function useStudentExamsQuery(status: StudentExamStatusFilter = 'ALL') {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'student-exams', status),
    queryFn: () => studentPortalApi.fetchMyExams(status),
    enabled: Boolean(tenantId),
  });
}

export function useStudentSubjectsQuery() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'subjects'),
    queryFn: () => studentPortalApi.fetchTenantSubjects(),
    enabled: Boolean(tenantId),
  });
}

export function useStudentHistoryQuery(studentId: string | null | undefined) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'student-history', studentId),
    queryFn: () => {
      if (!studentId) return Promise.reject(new Error('Student ID is required'));
      return studentPortalApi.fetchStudentHistory(studentId);
    },
    enabled: Boolean(tenantId && studentId),
  });
}

export function useStudentExamDashboardQuery(examId: string | null | undefined) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'student-exam-dashboard', examId),
    queryFn: () => {
      if (!examId) return Promise.reject(new Error('Exam ID is required'));
      return studentPortalApi.fetchExamDashboard(examId);
    },
    enabled: Boolean(tenantId && examId),
  });
}

export function useStudentAiReportQuery(examId: string | null | undefined) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'student-ai-report', examId),
    queryFn: () => {
      if (!examId) return Promise.reject(new Error('Exam ID is required'));
      return studentPortalApi.fetchAiReportStatus(examId);
    },
    enabled: Boolean(tenantId && examId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'PENDING' || status === 'PROCESSING') {
        return 3000;
      }
      return false;
    },
  });
}

export function usePublicShareQuery(token: string | null | undefined) {
  return useQuery({
    queryKey: ['public-share', token] as const,
    queryFn: () => {
      if (!token) return Promise.reject(new Error('Share token is required'));
      return studentPortalApi.fetchSharedSnapshot(token);
    },
    enabled: Boolean(token),
    retry: false,
  });
}

