import { z } from 'zod';

export const createExamSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Sınav adı en az 3 karakter olmalıdır')
    .max(255, 'Sınav adı en fazla 255 karakter olabilir'),
  examDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçerli bir tarih seçiniz (YYYY-AA-GG)'),
  examType: z
    .string()
    .trim()
    .min(1, 'Sınav tipi seçiniz veya giriniz')
    .max(50, 'Sınav tipi en fazla 50 karakter olabilir'),
});

export type CreateExamFormValues = z.infer<typeof createExamSchema>;

export const updateExamSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Sınav adı en az 3 karakter olmalıdır')
    .max(255, 'Sınav adı en fazla 255 karakter olabilir')
    .optional(),
  examDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçerli bir tarih seçiniz (YYYY-AA-GG)')
    .optional(),
  examType: z
    .string()
    .trim()
    .min(1, 'Sınav tipi seçiniz veya giriniz')
    .max(50, 'Sınav tipi en fazla 50 karakter olabilir')
    .optional(),
});

export type UpdateExamFormValues = z.infer<typeof updateExamSchema>;

