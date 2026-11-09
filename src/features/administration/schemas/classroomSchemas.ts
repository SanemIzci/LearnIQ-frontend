import { z } from 'zod';

export const createClassroomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Sınıf adı en az 2 karakter olmalıdır')
    .max(100, 'Sınıf adı en fazla 100 karakter olabilir'),
});

export type CreateClassroomFormValues = z.infer<typeof createClassroomSchema>;

export const addMemberSchema = z.object({
  userId: z.string().trim().min(1, 'Lütfen atanacak kullanıcıyı seçiniz'),
});

export type AddMemberFormValues = z.infer<typeof addMemberSchema>;

