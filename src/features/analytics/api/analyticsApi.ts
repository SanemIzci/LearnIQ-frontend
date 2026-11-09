import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { useAppSelector } from '@/store';
import type {
  AdminDashboardResponse,
  ClassSubjectTrendRow,
  ClassroomAnalyticsResponse,
  ClassroomComparisonResponse,
  ClassroomResponse,
  CreateObservationRequest,
  ExamResponse,
  ObservationResponse,
  RecentObservationDto,
  StudentTrendReportDto,
  SubjectResponse,
  SubjectScorecardResponse,
  UpdateObservationRequest,
} from '@/types/api';

export const analyticsApi = {
  fetchAdminDashboard: async (): Promise<AdminDashboardResponse> => {
    return apiClient.get<AdminDashboardResponse>('/api/v1/analytics/admin/dashboard');
  },

  fetchAdminSubjectScorecard: async (examId?: string): Promise<SubjectScorecardResponse> => {
    const query = new URLSearchParams();
    if (examId) query.set('examId', examId);
    const qs = query.toString();
    return apiClient.get<SubjectScorecardResponse>(
      `/api/v1/analytics/admin/subjects${qs ? `?${qs}` : ''}`
    );
  },

  fetchAdminTrends: async (
    subjectId?: string,
    limit: number = 50
  ): Promise<ClassSubjectTrendRow[]> => {
    const query = new URLSearchParams();
    if (subjectId) query.set('subjectId', subjectId);
    if (limit) query.set('limit', String(limit));
    return apiClient.get<ClassSubjectTrendRow[]>(
      `/api/v1/analytics/admin/trends?${query.toString()}`
    );
  },

  fetchRecentObservations: async (limit: number = 10): Promise<RecentObservationDto[]> => {
    return apiClient.get<RecentObservationDto[]>(
      `/api/v1/analytics/admin/observations/recent?limit=${encodeURIComponent(String(limit))}`
    );
  },

  fetchClassroomAnalytics: async (
    classroomId: string,
    examId?: string
  ): Promise<ClassroomAnalyticsResponse> => {
    const query = new URLSearchParams();
    if (examId) query.set('examId', examId);
    const qs = query.toString();
    return apiClient.get<ClassroomAnalyticsResponse>(
      `/api/v1/teachers/me/classrooms/${encodeURIComponent(classroomId)}/analytics${qs ? `?${qs}` : ''}`
    );
  },

  compareClassrooms: async (
    classroomIds: string[],
    examId?: string
  ): Promise<ClassroomComparisonResponse> => {
    const query = new URLSearchParams();
    if (classroomIds.length > 0) {
      query.set('classroomIds', classroomIds.join(','));
    }
    if (examId) {
      query.set('examId', examId);
    }
    return apiClient.get<ClassroomComparisonResponse>(
      `/api/v1/teachers/me/comparison?${query.toString()}`
    );
  },

  fetchMyObservations: async (): Promise<ObservationResponse[]> => {
    return apiClient.get<ObservationResponse[]>('/api/v1/teachers/me/observations');
  },

  fetchClassroomObservations: async (classroomId: string): Promise<ObservationResponse[]> => {
    return apiClient.get<ObservationResponse[]>(
      `/api/v1/teachers/me/classrooms/${encodeURIComponent(classroomId)}/observations`
    );
  },

  createObservation: async (
    classroomId: string,
    payload: CreateObservationRequest
  ): Promise<ObservationResponse> => {
    return apiClient.post<ObservationResponse>(
      `/api/v1/teachers/me/classrooms/${encodeURIComponent(classroomId)}/observations`,
      payload
    );
  },

  updateObservation: async (
    observationId: string,
    payload: UpdateObservationRequest
  ): Promise<ObservationResponse> => {
    return apiClient.put<ObservationResponse>(
      `/api/v1/teachers/me/observations/${encodeURIComponent(observationId)}`,
      payload
    );
  },

  deleteObservation: async (observationId: string): Promise<void> => {
    await apiClient.delete<void>(
      `/api/v1/teachers/me/observations/${encodeURIComponent(observationId)}`
    );
  },

  fetchStudentHistory: async (studentId: string): Promise<StudentTrendReportDto> => {
    return apiClient.get<StudentTrendReportDto>(
      `/api/v1/analytics/students/${encodeURIComponent(studentId)}/history`
    );
  },

  generateStudentAiReport: async (studentId: string): Promise<void> => {
    await apiClient.post<void>(
      `/api/v1/analytics/students/${encodeURIComponent(studentId)}/reports/generate`
    );
  },

  fetchClassrooms: async (): Promise<ClassroomResponse[]> => {
    const raw = await apiClient.get<unknown>('/api/v1/classrooms');
    if (Array.isArray(raw)) return raw as ClassroomResponse[];
    if (raw && typeof raw === 'object' && 'content' in raw && Array.isArray((raw as { content: unknown[] }).content)) {
      return (raw as { content: ClassroomResponse[] }).content;
    }
    return [];
  },

  fetchExams: async (): Promise<ExamResponse[]> => {
    const raw = await apiClient.get<unknown>('/api/v1/exams');
    if (Array.isArray(raw)) return raw as ExamResponse[];
    if (raw && typeof raw === 'object' && 'content' in raw && Array.isArray((raw as { content: unknown[] }).content)) {
      return (raw as { content: ExamResponse[] }).content;
    }
    return [];
  },

  fetchSubjects: async (): Promise<SubjectResponse[]> => {
    return apiClient.get<SubjectResponse[]>('/api/v1/subjects');
  },
};

export function useAdminDashboardQuery() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const role = useAppSelector((state) => state.auth.user?.role);
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'admin-analytics-dashboard'),
    queryFn: () => analyticsApi.fetchAdminDashboard(),
    enabled: Boolean(tenantId && isAdmin),
  });
}

export function useAdminSubjectScorecardQuery(examId?: string) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const role = useAppSelector((state) => state.auth.user?.role);
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'admin-subject-scorecard', examId || 'ALL'),
    queryFn: () => analyticsApi.fetchAdminSubjectScorecard(examId),
    enabled: Boolean(tenantId && isAdmin),
  });
}

export function useAdminTrendsQuery(subjectId?: string, limit: number = 50) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const role = useAppSelector((state) => state.auth.user?.role);
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'admin-analytics-trends', subjectId || 'ALL', limit),
    queryFn: () => analyticsApi.fetchAdminTrends(subjectId, limit),
    enabled: Boolean(tenantId && isAdmin),
  });
}

export function useClassroomAnalyticsQuery(classroomId: string | undefined, examId?: string) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'classroom-analytics', classroomId, examId || 'LATEST'),
    queryFn: () => {
      if (!classroomId) return Promise.reject(new Error('Classroom ID is required'));
      return analyticsApi.fetchClassroomAnalytics(classroomId, examId);
    },
    enabled: Boolean(tenantId && classroomId),
  });
}

export function useClassroomComparisonQuery(classroomIds: string[], examId?: string) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const sortedIds = [...classroomIds].sort().join(',');

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'classroom-comparison', sortedIds, examId || 'LATEST'),
    queryFn: () => analyticsApi.compareClassrooms(classroomIds, examId),
    enabled: Boolean(tenantId && classroomIds.length > 0),
  });
}

export function useClassroomObservationsQuery(classroomId: string | undefined) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'classroom-observations', classroomId),
    queryFn: () => {
      if (!classroomId) return Promise.reject(new Error('Classroom ID is required'));
      return analyticsApi.fetchClassroomObservations(classroomId);
    },
    enabled: Boolean(tenantId && classroomId),
  });
}

export function useTeacherObservationsQuery() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'my-teacher-observations'),
    queryFn: () => analyticsApi.fetchMyObservations(),
    enabled: Boolean(tenantId),
  });
}

export function useStudentAnalyticsHistoryQuery(studentId: string | undefined) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'student-analytics-history', studentId),
    queryFn: () => {
      if (!studentId) return Promise.reject(new Error('Student ID is required'));
      return analyticsApi.fetchStudentHistory(studentId);
    },
    enabled: Boolean(tenantId && studentId),
  });
}

export function useAnalyticsClassroomsQuery() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'classrooms'),
    queryFn: () => analyticsApi.fetchClassrooms(),
    enabled: Boolean(tenantId),
  });
}

export function useAnalyticsExamsQuery() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'exams'),
    queryFn: () => analyticsApi.fetchExams(),
    enabled: Boolean(tenantId),
  });
}

export function useAnalyticsSubjectsQuery() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'subjects'),
    queryFn: () => analyticsApi.fetchSubjects(),
    enabled: Boolean(tenantId),
  });
}

