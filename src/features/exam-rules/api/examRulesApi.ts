import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { useAppSelector } from '@/store';
import type {
  ExamTypeSubjectRuleRequest,
  ExamTypeSubjectRuleResponse,
} from '@/types/api';

export const examRulesApi = {
  fetchRules: async (examType: string): Promise<ExamTypeSubjectRuleResponse[]> => {
    return apiClient.get<ExamTypeSubjectRuleResponse[]>(
      `/api/v1/exam-rules/${encodeURIComponent(examType)}`
    );
  },

  upsertRule: async (
    examType: string,
    subjectId: string,
    data: ExamTypeSubjectRuleRequest
  ): Promise<ExamTypeSubjectRuleResponse> => {
    return apiClient.put<ExamTypeSubjectRuleResponse>(
      `/api/v1/exam-rules/${encodeURIComponent(examType)}/${encodeURIComponent(subjectId)}`,
      data
    );
  },
};

export function useExamRulesQuery(examType: string | undefined | null) {
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useQuery({
    queryKey: tenantQueryKey(tenantId, 'exam-rules', examType),
    queryFn: () => {
      if (!examType) return Promise.resolve([]);
      return examRulesApi.fetchRules(examType);
    },
    enabled: Boolean(tenantId && examType),
  });
}

export function useUpsertExamRuleMutation() {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  return useMutation({
    mutationFn: async ({
      examType,
      subjectId,
      data,
    }: {
      examType: string;
      subjectId: string;
      data: ExamTypeSubjectRuleRequest;
    }) => {
      return examRulesApi.upsertRule(examType, subjectId, data);
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'exam-rules', variables.examType),
      });
    },
  });
}

