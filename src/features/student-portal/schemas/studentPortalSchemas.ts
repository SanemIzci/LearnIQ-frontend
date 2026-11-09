import { z } from 'zod';

export function defaultPenaltyDivisorForExamType(examType: string): number {
  return examType.trim().toUpperCase() === 'LGS' ? 3.0 : 4.0;
}

export const subjectResultRowSchema = z.object({
  subjectId: z.string().trim().min(1, 'Ders seçimi zorunludur'),
  subjectName: z.string().optional(),
  correctCount: z.coerce
    .number({ invalid_type_error: 'Geçerli bir sayı giriniz' })
    .int('Doğru sayısı tam sayı olmalıdır')
    .min(0, 'Doğru sayısı negatif olamaz'),
  wrongCount: z.coerce
    .number({ invalid_type_error: 'Geçerli bir sayı giriniz' })
    .int('Yanlış sayısı tam sayı olmalıdır')
    .min(0, 'Yanlış sayısı negatif olamaz'),
});

export const submitExamResultSchema = z
  .object({
    subjects: z
      .array(subjectResultRowSchema)
      .min(1, 'En az bir ders için sonuç girmelisiniz'),
  })
  .superRefine((data, ctx) => {
    const seenSubjectIds = new Set<string>();

    data.subjects.forEach((row, index) => {
      if (row.subjectId) {
        if (seenSubjectIds.has(row.subjectId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['subjects', index, 'subjectId'],
            message: 'Aynı ders birden fazla kez gönderilemez',
          });
        }
        seenSubjectIds.add(row.subjectId);
      }
    });
  });

export type SubjectResultRowFormValues = z.infer<typeof subjectResultRowSchema>;
export type SubmitExamResultFormValues = z.infer<typeof submitExamResultSchema>;
