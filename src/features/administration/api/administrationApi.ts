import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { useAppSelector } from '@/store';
import type {
  AdminUserSummary,
  CreateClassroomRequest,
  CreateSubjectTopicRequest,
  PatchUserRequest,
  RegisterRequest,
  SubjectRequest,
  SubjectResponse,
  SubjectTopicResponse,
  UpdateSubjectTopicRequest,
  UserListResponse,
} from '@/types/api';

export interface UserQueryParams {
  page?: number;
  size?: number;
  role?: string;
  search?: string;
}

export interface ClassroomMemberItem {
  id: string;
  username: string;
  email: string;
  fullName: string;
  joinedAt?: string;
}

export const administrationApi = {
  // ── 1. User Management (auth-service) ───────────────────────────────────────
  fetchUsers: async (params: UserQueryParams = {}): Promise<UserListResponse> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    if (params.role) query.set('role', params.role);
    if (params.search) query.set('search', params.search);
    const qs = query.toString();
    return apiClient.get<UserListResponse>(`/api/v1/users${qs ? `?${qs}` : ''}`);
  },

  fetchUserDetail: async (userId: string): Promise<AdminUserSummary> => {
    return apiClient.get<AdminUserSummary>(`/api/v1/users/${encodeURIComponent(userId)}`);
  },

  registerUser: async (payload: RegisterRequest): Promise<void> => {
    // Note: tenantId is automatically injected via X-Tenant-Id header by apiClient
    await apiClient.post<unknown>('/api/v1/auth/register', payload);
  },

  patchUser: async (userId: string, payload: PatchUserRequest): Promise<AdminUserSummary> => {
    return apiClient.patch<AdminUserSummary>(
      `/api/v1/users/${encodeURIComponent(userId)}`,
      payload
    );
  },

  resetPassword: async (userId: string, newPassword: string): Promise<{ reset: boolean }> => {
    return apiClient.post<{ reset: boolean }>(
      `/api/v1/users/${encodeURIComponent(userId)}/reset-password`,
      { newPassword }
    );
  },

  // ── 2. Subject & Topic Management (exam-service) ───────────────────────────
  fetchSubjects: async (): Promise<SubjectResponse[]> => {
    return apiClient.get<SubjectResponse[]>('/api/v1/subjects');
  },

  createSubject: async (payload: SubjectRequest): Promise<SubjectResponse> => {
    return apiClient.post<SubjectResponse>('/api/v1/subjects', payload);
  },

  updateSubject: async (
    subjectId: string,
    payload: SubjectRequest
  ): Promise<SubjectResponse> => {
    return apiClient.put<SubjectResponse>(
      `/api/v1/subjects/${encodeURIComponent(subjectId)}`,
      payload
    );
  },

  deleteSubject: async (subjectId: string): Promise<void> => {
    await apiClient.delete<void>(`/api/v1/subjects/${encodeURIComponent(subjectId)}`);
  },

  fetchTopics: async (subjectId: string): Promise<SubjectTopicResponse[]> => {
    return apiClient.get<SubjectTopicResponse[]>(
      `/api/v1/subjects/${encodeURIComponent(subjectId)}/topics`
    );
  },

  createTopic: async (
    subjectId: string,
    payload: CreateSubjectTopicRequest
  ): Promise<SubjectTopicResponse> => {
    return apiClient.post<SubjectTopicResponse>(
      `/api/v1/subjects/${encodeURIComponent(subjectId)}/topics`,
      payload
    );
  },

  updateTopic: async (
    subjectId: string,
    topicId: string,
    payload: UpdateSubjectTopicRequest
  ): Promise<SubjectTopicResponse> => {
    return apiClient.put<SubjectTopicResponse>(
      `/api/v1/subjects/${encodeURIComponent(subjectId)}/topics/${encodeURIComponent(topicId)}`,
      payload
    );
  },

  deleteTopic: async (subjectId: string, topicId: string): Promise<void> => {
    await apiClient.delete<void>(
      `/api/v1/subjects/${encodeURIComponent(subjectId)}/topics/${encodeURIComponent(topicId)}`
    );
  },

  // ── 3. Classroom CRUD & Roster Management (exam-service) ───────────────────
  createClassroom: async (payload: CreateClassroomRequest): Promise<{ id: string; name: string }> => {
    return apiClient.post<{ id: string; name: string }>('/api/v1/classrooms', payload);
  },

  fetchClassroomTeachers: async (classroomId: string): Promise<ClassroomMemberItem[]> => {
    return apiClient.get<ClassroomMemberItem[]>(
      `/api/v1/classrooms/${encodeURIComponent(classroomId)}/teachers`
    );
  },

  addClassroomTeacher: async (classroomId: string, userId: string): Promise<void> => {
    await apiClient.post<unknown>(
      `/api/v1/classrooms/${encodeURIComponent(classroomId)}/teachers`,
      { userId }
    );
  },

  removeClassroomTeacher: async (classroomId: string, teacherId: string): Promise<void> => {
    await apiClient.delete<unknown>(
      `/api/v1/classrooms/${encodeURIComponent(classroomId)}/teachers/${encodeURIComponent(teacherId)}`
    );
  },

  fetchClassroomStudents: async (classroomId: string): Promise<ClassroomMemberItem[]> => {
    return apiClient.get<ClassroomMemberItem[]>(
      `/api/v1/classrooms/${encodeURIComponent(classroomId)}/students`
    );
  },

  addClassroomStudent: async (classroomId: string, userId: string): Promise<void> => {
    await apiClient.post<unknown>(
      `/api/v1/classrooms/${encodeURIComponent(classroomId)}/students`,
      { userId }
    );
  },

  removeClassroomStudent: async (classroomId: string, studentId: string): Promise<void> => {
    await apiClient.delete<unknown>(
      `/api/v1/classrooms/${encodeURIComponent(classroomId)}/students/${encodeURIComponent(studentId)}`
    );
  },
};

// ── React Query Hooks ─────────────────────────────────────────────────────────

export function useAdminUsersQuery(params: UserQueryParams = {}) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const role = useAppSelector((state) => state.auth.user?.role);
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  return useQuery({
    queryKey: tenantQueryKey(
      tenantId,
      'admin-users',
      params.page ?? 0,
      params.size ?? 20,
      params.role ?? 'ALL',
      params.search ?? ''
    ),
    queryFn: () => administrationApi.fetchUsers(params),
    enabled: Boolean(tenantId && isAdmin),
  });
}

export function useRegisterUserMutation() {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: (payload: RegisterRequest) => administrationApi.registerUser(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'admin-users'),
      });
    },
  });
}

export function usePatchUserMutation() {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: PatchUserRequest }) =>
      administrationApi.patchUser(userId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'admin-users'),
      });
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      administrationApi.resetPassword(userId, newPassword),
  });
}

export function useAdministrationSubjectsQuery() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'subjects'),
    queryFn: () => administrationApi.fetchSubjects(),
    enabled: Boolean(tenantId),
  });
}

export function useCreateSubjectMutation() {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: (payload: SubjectRequest) => administrationApi.createSubject(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'subjects'),
      });
    },
  });
}

export function useUpdateSubjectMutation() {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: ({
      subjectId,
      payload,
    }: {
      subjectId: string;
      payload: SubjectRequest;
    }) => administrationApi.updateSubject(subjectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'subjects'),
      });
    },
  });
}

export function useDeleteSubjectMutation() {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: (subjectId: string) => administrationApi.deleteSubject(subjectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'subjects'),
      });
    },
  });
}

export function useSubjectTopicsQuery(subjectId: string | undefined | null) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'subject-topics', subjectId),
    queryFn: () => {
      if (!subjectId) return Promise.resolve([]);
      return administrationApi.fetchTopics(subjectId);
    },
    enabled: Boolean(tenantId && subjectId),
  });
}

export function useCreateTopicMutation(subjectId: string) {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: (payload: CreateSubjectTopicRequest) =>
      administrationApi.createTopic(subjectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'subject-topics', subjectId),
      });
    },
  });
}

export function useUpdateTopicMutation(subjectId: string) {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: ({
      topicId,
      payload,
    }: {
      topicId: string;
      payload: UpdateSubjectTopicRequest;
    }) => administrationApi.updateTopic(subjectId, topicId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'subject-topics', subjectId),
      });
    },
  });
}

export function useDeleteTopicMutation(subjectId: string) {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: (topicId: string) => administrationApi.deleteTopic(subjectId, topicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'subject-topics', subjectId),
      });
    },
  });
}

export function useCreateClassroomMutation() {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: (payload: CreateClassroomRequest) =>
      administrationApi.createClassroom(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'classrooms'),
      });
    },
  });
}

export function useClassroomTeachersQuery(classroomId: string | undefined | null) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'classroom-teachers', classroomId),
    queryFn: () => {
      if (!classroomId) return Promise.resolve([]);
      return administrationApi.fetchClassroomTeachers(classroomId);
    },
    enabled: Boolean(tenantId && classroomId),
  });
}

export function useClassroomStudentsQuery(classroomId: string | undefined | null) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'classroom-students', classroomId),
    queryFn: () => {
      if (!classroomId) return Promise.resolve([]);
      return administrationApi.fetchClassroomStudents(classroomId);
    },
    enabled: Boolean(tenantId && classroomId),
  });
}

export function useAddClassroomTeacherMutation(classroomId: string) {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: (userId: string) =>
      administrationApi.addClassroomTeacher(classroomId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'classroom-teachers', classroomId),
      });
    },
  });
}

export function useRemoveClassroomTeacherMutation(classroomId: string) {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: (teacherId: string) =>
      administrationApi.removeClassroomTeacher(classroomId, teacherId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'classroom-teachers', classroomId),
      });
    },
  });
}

export function useAddClassroomStudentMutation(classroomId: string) {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: (userId: string) =>
      administrationApi.addClassroomStudent(classroomId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'classroom-students', classroomId),
      });
    },
  });
}

export function useRemoveClassroomStudentMutation(classroomId: string) {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: (studentId: string) =>
      administrationApi.removeClassroomStudent(classroomId, studentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'classroom-students', classroomId),
      });
    },
  });
}

