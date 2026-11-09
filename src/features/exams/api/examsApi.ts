import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { normalizePaginatedResponse } from '@/lib/api/pagination';
import { useAppSelector } from '@/store';
import type {
  ClassroomResponse,
  DualModeListResponse,
  ExamCreateRequest,
  ExamResponse,
  ExamUpdateRequest,
  PageResponse,
  RejectionRequest,
  ResultStatus,
  StudentExamResult,
  SubjectResponse,
} from '@/types/api';

export interface ExamsQueryParams {
  page?: number;
  size?: number;
  sort?: string;
}

export const examsApi = {
  fetchExams: async (params: ExamsQueryParams = {}): Promise<PageResponse<ExamResponse>> => {
    const { page = 0, size = 15, sort = 'examDate,desc' } = params;
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('size', String(size));
    if (sort) query.set('sort', sort);

    const raw = await apiClient.get<DualModeListResponse<ExamResponse>>(
      `/api/v1/exams?${query.toString()}`
    );
    return normalizePaginatedResponse<ExamResponse>(raw, page, size);
  },

  fetchExamById: async (id: string): Promise<ExamResponse> => {
    return apiClient.get<ExamResponse>(`/api/v1/exams/${encodeURIComponent(id)}`);
  },

  createExam: async (data: ExamCreateRequest): Promise<ExamResponse> => {
    return apiClient.post<ExamResponse>('/api/v1/exams', data);
  },

  updateExam: async (id: string, data: ExamUpdateRequest): Promise<ExamResponse> => {
    return apiClient.put<ExamResponse>(`/api/v1/exams/${encodeURIComponent(id)}`, data);
  },

  deleteExam: async (id: string): Promise<void> => {
    await apiClient.delete<void>(`/api/v1/exams/${encodeURIComponent(id)}`);
  },

  addSubject: async (examId: string, subjectId: string): Promise<ExamResponse> => {
    return apiClient.post<ExamResponse>(
      `/api/v1/exams/${encodeURIComponent(examId)}/subjects/${encodeURIComponent(subjectId)}`
    );
  },

  removeSubject: async (examId: string, subjectId: string): Promise<ExamResponse> => {
    return apiClient.delete<ExamResponse>(
      `/api/v1/exams/${encodeURIComponent(examId)}/subjects/${encodeURIComponent(subjectId)}`
    );
  },

  assignClassroom: async (examId: string, classroomId: string): Promise<ExamResponse> => {
    return apiClient.post<ExamResponse>(
      `/api/v1/exams/${encodeURIComponent(examId)}/classrooms`,
      { classroomId }
    );
  },

  unassignClassroom: async (examId: string, classroomId: string): Promise<ExamResponse> => {
    return apiClient.delete<ExamResponse>(
      `/api/v1/exams/${encodeURIComponent(examId)}/classrooms/${encodeURIComponent(classroomId)}`
    );
  },

  fetchSubjects: async (): Promise<SubjectResponse[]> => {
    return apiClient.get<SubjectResponse[]>('/api/v1/subjects');
  },

  fetchClassrooms: async (): Promise<ClassroomResponse[]> => {
    const raw = await apiClient.get<DualModeListResponse<ClassroomResponse>>(
      '/api/v1/classrooms'
    );
    const normalized = normalizePaginatedResponse<ClassroomResponse>(raw);
    return normalized.content;
  },

  fetchExamResults: async (
    examId: string,
    params: { status?: ResultStatus; page?: number; size?: number } = {}
  ): Promise<PageResponse<StudentExamResult>> => {
    const { status = 'SUBMITTED', page = 0, size = 15 } = params;
    const query = new URLSearchParams();
    query.set('status', status);
    query.set('page', String(page));
    query.set('size', String(size));

    const raw = await apiClient.get<DualModeListResponse<StudentExamResult>>(
      `/api/v1/exams/${encodeURIComponent(examId)}/results?${query.toString()}`
    );
    return normalizePaginatedResponse<StudentExamResult>(raw, page, size);
  },

  approveResult: async (examId: string, resultId: string): Promise<void> => {
    await apiClient.post<void>(
      `/api/v1/exams/${encodeURIComponent(examId)}/results/${encodeURIComponent(resultId)}/approve`
    );
  },

  rejectResult: async (
    examId: string,
    resultId: string,
    data: RejectionRequest
  ): Promise<void> => {
    await apiClient.post<void>(
      `/api/v1/exams/${encodeURIComponent(examId)}/results/${encodeURIComponent(resultId)}/reject`,
      data
    );
  },

  finalizeExam: async (examId: string): Promise<void> => {
    await apiClient.post<void>(
      `/api/v1/exams/${encodeURIComponent(examId)}/finalize`
    );
  },
};

export function useExamsQuery(params: ExamsQueryParams = {}) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const { page = 0, size = 15, sort = 'examDate,desc' } = params;

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'exams', page, size, sort),
    queryFn: () => examsApi.fetchExams(params),
    enabled: Boolean(tenantId),
  });
}

export function useExamDetailQuery(id: string | null | undefined) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'exams', id),
    queryFn: () => {
      if (!id) return Promise.reject(new Error('Exam ID is required'));
      return examsApi.fetchExamById(id);
    },
    enabled: Boolean(tenantId && id),
  });
}

export function useSubjectsQuery() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'subjects'),
    queryFn: () => examsApi.fetchSubjects(),
    enabled: Boolean(tenantId),
  });
}

export function useClassroomsQuery() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'classrooms'),
    queryFn: () => examsApi.fetchClassrooms(),
    enabled: Boolean(tenantId),
  });
}

export interface ExamResultsQueryParams {
  status?: ResultStatus;
  page?: number;
  size?: number;
}

export function useExamResultsQuery(
  examId: string | null | undefined,
  params: ExamResultsQueryParams = {}
) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const { status = 'SUBMITTED', page = 0, size = 15 } = params;

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'exam-results', examId, status, page, size),
    queryFn: () => {
      if (!examId) return Promise.reject(new Error('Exam ID is required'));
      return examsApi.fetchExamResults(examId, { status, page, size });
    },
    enabled: Boolean(tenantId && examId),
  });
}

