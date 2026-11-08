import { z } from 'zod';

export const examRuleSchema = z.object({
  questionCount: z
    .number({ invalid_type_error: 'Soru sayısı sayısal olmalıdır' })
    .int('Soru sayısı tam sayı olmalıdır')
    .min(1, 'Soru sayısı en az 1 olmalıdır'),
  penaltyDivisor: z
    .number({ invalid_type_error: 'Ceza katsayısı sayısal olmalıdır' })
    .positive('Ceza katsayısı sıfırdan büyük olmalıdır')
    .default(4.0),
});

export type ExamRuleFormValues = z.infer<typeof examRuleSchema>;

