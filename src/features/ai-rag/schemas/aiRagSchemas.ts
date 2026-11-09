import { z } from 'zod';

export const adminChatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Mesaj boş bırakılamaz')
    .max(4000, 'Mesaj 4000 karakterden uzun olamaz'),
  classroomId: z.string().optional(),
  subjectId: z.string().optional(),
  examId: z.string().optional(),
});

export type AdminChatFormValues = z.infer<typeof adminChatSchema>;

