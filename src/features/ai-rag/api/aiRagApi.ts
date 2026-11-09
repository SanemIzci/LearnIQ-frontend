import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type {
  AdminChatRequest,
  AdminChatResponse,
  RagBackfillResponse,
} from '@/types/api';

export const aiRagApi = {
  chatWithAi: async (payload: AdminChatRequest): Promise<AdminChatResponse> => {
    return apiClient.post<AdminChatResponse>('/api/v1/admin/ai/chat', payload);
  },

  triggerBackfill: async (batchSize: number = 50): Promise<RagBackfillResponse> => {
    return apiClient.post<RagBackfillResponse>(
      `/api/v1/admin/ai/rag/backfill?batchSize=${encodeURIComponent(String(batchSize))}`
    );
  },
};

export function useAdminChatMutation() {
  return useMutation({
    mutationFn: (payload: AdminChatRequest) => aiRagApi.chatWithAi(payload),
  });
}

export function useRagBackfillMutation() {
  return useMutation({
    mutationFn: (batchSize: number = 50) => aiRagApi.triggerBackfill(batchSize),
  });
}

