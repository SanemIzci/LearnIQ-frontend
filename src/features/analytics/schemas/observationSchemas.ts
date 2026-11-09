import { z } from 'zod';

export const observationSchema = z.object({
  content: z
    .string()
    .trim()
    .min(10, 'Gözlem içeriği en az 10 karakter olmalıdır')
    .max(5000, 'Gözlem içeriği en fazla 5000 karakter olabilir'),
  subjectId: z.string().optional(),
  examId: z.string().optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
});

export type ObservationFormValues = z.infer<typeof observationSchema>;

