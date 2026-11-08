import { z } from 'zod';
import { TENANT_SCHEMA_REGEX } from '@/lib/utils';

export const tenantLoginSchema = z.object({
  tenantId: z
    .string()
    .trim()
    .min(1, 'Kiracı (tenant) kodu zorunludur.')
    .regex(
      TENANT_SCHEMA_REGEX,
      'Kiracı kodu küçük harfle başlamalı ve yalnızca küçük harf, rakam ve alt çizgi içermelidir (en fazla 63 karakter).'
    ),
  username: z.string().trim().min(1, 'Kullanıcı adı zorunludur.'),
  password: z.string().min(1, 'Şifre zorunludur.'),
});

export type TenantLoginFormValues = z.infer<typeof tenantLoginSchema>;

export const platformLoginSchema = z.object({
  username: z.string().trim().min(1, 'Yönetici kullanıcı adı zorunludur.'),
  password: z.string().min(1, 'Şifre zorunludur.'),
});

export type PlatformLoginFormValues = z.infer<typeof platformLoginSchema>;

export const tenantSwitchSchema = z.object({
  tenantId: z
    .string()
    .trim()
    .min(1, 'Geçerli bir kiracı kodu giriniz.')
    .regex(
      TENANT_SCHEMA_REGEX,
      'Kiracı kodu küçük harfle başlamalı ve yalnızca küçük harf, rakam ve alt çizgi içermelidir (en fazla 63 karakter).'
    ),
});

export type TenantSwitchFormValues = z.infer<typeof tenantSwitchSchema>;

