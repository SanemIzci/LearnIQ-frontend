import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { UserRole } from '@/types/api';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Matches backend TenantSchemaValidator.java:15 regex exactly:
 * ^[a-z][a-z0-9_]{0,62}$ (starts with lowercase letter, max 63 chars)
 */
export const TENANT_SCHEMA_REGEX = /^[a-z][a-z0-9_]{0,62}$/;

export function isValidTenantId(tenantId: string | null | undefined): tenantId is string {
  if (!tenantId) return false;
  return TENANT_SCHEMA_REGEX.test(tenantId);
}

const VALID_USER_ROLES: ReadonlySet<string> = new Set<UserRole>([
  'SUPER_ADMIN',
  'ADMIN',
  'TEACHER',
  'STUDENT',
]);

export function isValidUserRole(role: unknown): role is UserRole {
  return typeof role === 'string' && VALID_USER_ROLES.has(role);
}

/**
 * Safely decodes the JWT `exp` claim (epoch milliseconds) for client-side
 * session expiry countdowns (e.g. SUPER_ADMIN 15-min token warning).
 * Never used for security enforcement (backend validates signatures).
 */
export function decodeJwtExpiryMs(token: string | null | undefined): number | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof payload.exp === 'number' && Number.isFinite(payload.exp)) {
      return payload.exp * 1000;
    }
    return null;
  } catch {
    return null;
  }
}
