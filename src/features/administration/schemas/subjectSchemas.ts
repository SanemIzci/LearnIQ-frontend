import { z } from 'zod';

export const subjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Ders adı en az 2 karakter olmalıdır')
    .max(100, 'Ders adı en fazla 100 karakter olabilir'),
});

export type SubjectFormValues = z.infer<typeof subjectSchema>;

export const createSubjectTopicSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Konu başlığı en az 2 karakter olmalıdır')
    .max(150, 'Konu başlığı en fazla 150 karakter olabilir'),
  code: z
    .string()
    .trim()
    .max(50, 'Konu kodu en fazla 50 karakter olabilir')
    .optional(),
  orderIndex: z.coerce
    .number({ invalid_type_error: 'Sıra numarası geçerli bir sayı olmalıdır' })
    .int('Sıra numarası tam sayı olmalıdır')
    .min(0, 'Sıra numarası 0 veya daha büyük olmalıdır')
    .default(0),
});

export type CreateSubjectTopicFormValues = z.infer<typeof createSubjectTopicSchema>;

export const updateSubjectTopicSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Konu başlığı en az 2 karakter olmalıdır')
    .max(150, 'Konu başlığı en fazla 150 karakter olabilir')
    .optional(),
  code: z
    .string()
    .trim()
    .max(50, 'Konu kodu en fazla 50 karakter olabilir')
    .optional(),
  orderIndex: z
    .number()
    .int()
    .min(0)
    .optional(),
});

export type UpdateSubjectTopicFormValues = z.infer<typeof updateSubjectTopicSchema>;

