import { z } from 'zod';
import { TENANT_SCHEMA_REGEX } from '@/lib/utils';

export const createTenantSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, 'Kiracı (şema) kodu zorunludur.')
    .regex(
      TENANT_SCHEMA_REGEX,
      'Kiracı kodu küçük harfle başlamalı ve yalnızca küçük harf, rakam ve alt çizgi içermelidir (en fazla 63 karakter).'
    ),
  name: z.string().trim().min(1, 'Kurum adı zorunludur.'),
  domain: z.string().trim().optional(),
  adminUsername: z.string().trim().min(1, 'Yönetici kullanıcı adı zorunludur.'),
  adminEmail: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || z.string().email().safeParse(val).success,
      'Geçerli bir e-posta adresi giriniz veya boş bırakınız.'
    ),
  adminFullName: z.string().trim().optional(),
  adminPassword: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 8,
      'Yönetici şifresi belirtilecekse en az 8 karakter olmalıdır.'
    ),
});

export type CreateTenantFormValues = z.infer<typeof createTenantSchema>;

export const updateSubscriptionSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED'], {
    required_error: 'Abonelik durumu zorunludur.',
  }),
});

export type UpdateSubscriptionFormValues = z.infer<typeof updateSubscriptionSchema>;

export const createGlobalUserSchema = z.object({
  username: z.string().trim().min(1, 'Yönetici kullanıcı adı zorunludur.'),
  email: z.string().trim().min(1, 'E-posta zorunludur.').email('Geçerli bir e-posta adresi giriniz.'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.'),
});

export type CreateGlobalUserFormValues = z.infer<typeof createGlobalUserSchema>;

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Yeni şifre en az 8 karakter olmalıdır.'),
});

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

