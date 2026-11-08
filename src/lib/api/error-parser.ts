import type { ErrorResponse } from '@/types/api';

/**
 * Standardized API Error wrapping backend ErrorResponse contract.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly errorCode: string;
  public readonly details: string[];
  public readonly path?: string;
  public readonly timestamp?: string;

  constructor(payload: ErrorResponse) {
    const primaryMessage =
      payload.message ||
      (payload.details && payload.details.length > 0 ? payload.details.join(', ') : null) ||
      (payload.messages && payload.messages.length > 0 ? payload.messages.join(', ') : null) ||
      payload.error ||
      `HTTP Hatası (${payload.status})`;

    super(primaryMessage);
    this.name = 'ApiError';
    this.status = payload.status;
    this.errorCode = payload.error || 'HTTP_ERROR';
    this.details = payload.details ?? payload.messages ?? (payload.message ? [payload.message] : []);
    this.path = payload.path;
    this.timestamp = payload.timestamp;
  }
}

export async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const text = await response.text();
    if (!text) {
      return new ApiError({
        status: response.status,
        error: response.statusText || 'HTTP_ERROR',
        message: statusFallbackMessage(response.status),
      });
    }

    const parsed = JSON.parse(text) as Partial<ErrorResponse> & { error?: string; message?: string };
    return new ApiError({
      status: parsed.status ?? response.status,
      error: parsed.error ?? (response.statusText || 'HTTP_ERROR'),
      message: parsed.message ?? (typeof parsed.error === 'string' ? parsed.error : statusFallbackMessage(response.status)),
      details: Array.isArray(parsed.details) ? parsed.details : undefined,
      messages: Array.isArray(parsed.messages) ? parsed.messages : undefined,
      path: parsed.path,
      timestamp: parsed.timestamp,
    });
  } catch {
    return new ApiError({
      status: response.status,
      error: response.statusText || 'HTTP_ERROR',
      message: statusFallbackMessage(response.status),
    });
  }
}

function statusFallbackMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Geçersiz istek veya eksik kiracı (tenant) bilgisi.';
    case 401:
      return 'Oturum süreniz doldu veya kimlik doğrulaması başarısız oldu.';
    case 403:
      return 'Bu işlem veya kayıt için erişim yetkiniz bulunmuyor.';
    case 404:
      return 'İstenen kayıt bulunamadı.';
    case 409:
      return 'İşlem mevcut kayıt durumuyla çelişiyor (409 Conflict).';
    default:
      return `Sunucu hatası oluştu (HTTP ${status}).`;
  }
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Beklenmeyen bir hata oluştu.';
}

