import { z } from 'zod';

export const registerUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Kullanıcı adı en az 3 karakter olmalıdır')
    .max(50, 'Kullanıcı adı en fazla 50 karakter olabilir')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Kullanıcı adı sadece harf, rakam, nokta ve tire içerebilir'),
  email: z
    .string()
    .trim()
    .email('Geçerli bir e-posta adresi giriniz')
    .max(100, 'E-posta adresi 100 karakterden uzun olamaz'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .max(100, 'Şifre en fazla 100 karakter olabilir'),
  fullName: z
    .string()
    .trim()
    .min(2, 'Ad Soyad en az 2 karakter olmalıdır')
    .max(100, 'Ad Soyad en fazla 100 karakter olabilir'),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT'], {
    errorMap: () => ({ message: 'Lütfen geçerli bir kullanıcı rolü seçiniz' }),
  }),
});

export type RegisterUserFormValues = z.infer<typeof registerUserSchema>;

export const patchUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Ad Soyad en az 2 karakter olmalıdır')
    .max(100, 'Ad Soyad en fazla 100 karakter olabilir')
    .optional(),
  email: z
    .string()
    .trim()
    .email('Geçerli bir e-posta adresi giriniz')
    .max(100, 'E-posta adresi 100 karakterden uzun olamaz')
    .optional(),
  active: z.boolean().optional(),
});

export type PatchUserFormValues = z.infer<typeof patchUserSchema>;

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Yeni şifre en az 8 karakter olmalıdır')
    .max(100, 'Yeni şifre en fazla 100 karakter olabilir'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Şifreler birbiriyle eşleşmiyor',
  path: ['confirmPassword'],
});

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

