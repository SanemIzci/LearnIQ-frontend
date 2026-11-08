import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, KeyRound, Loader2, LogIn, User } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { setCredentials } from '@/store/authSlice';
import { apiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/error-parser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import type { AuthResponse } from '@/types/api';
import { tenantLoginSchema, type TenantLoginFormValues } from '../schemas/authSchemas';

export const LAST_TENANT_ID_STORAGE_KEY = 'learniq.last_tenant_id';

export function TenantLoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [serverError, setServerError] = React.useState<string | null>(null);

  const isExpired = searchParams.get('reason') === 'expired';
  const isSwitched = searchParams.get('reason') === 'switched';

  // Pre-fill tenantId from URL query param if present, otherwise from last used tenantId
  const initialTenantId = React.useMemo(() => {
    const fromUrl = searchParams.get('tenant')?.trim();
    if (fromUrl) return fromUrl;
    if (typeof window !== 'undefined') {
      try {
        return window.localStorage.getItem(LAST_TENANT_ID_STORAGE_KEY) ?? '';
      } catch {
        return '';
      }
    }
    return '';
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TenantLoginFormValues>({
    resolver: zodResolver(tenantLoginSchema),
    defaultValues: {
      tenantId: initialTenantId,
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: TenantLoginFormValues) => {
    setServerError(null);

    try {
      const response = await apiClient.post<AuthResponse>(
        '/api/v1/auth/login',
        {
          tenantId: data.tenantId,
          username: data.username,
          password: data.password,
        },
        {
          skipAuth: true,
          tenantId: data.tenantId,
        }
      );

      // Only save the non-sensitive public tenant identifier (never passwords or tokens)
      try {
        window.localStorage.setItem(LAST_TENANT_ID_STORAGE_KEY, data.tenantId);
      } catch {
        // Ignore quota/privacy errors
      }

      dispatch(
        setCredentials({
          auth: response,
          tenantId: data.tenantId,
        })
      );

      const fromState = (location.state as { from?: string } | null)?.from;
      if (fromState && fromState !== '/login') {
        navigate(fromState, { replace: true });
        return;
      }

      // Default role landing pages
      if (response.role === 'STUDENT') {
        navigate('/student/home', { replace: true });
      } else if (response.role === 'SUPER_ADMIN') {
        navigate('/platform/tenants', { replace: true });
      } else {
        navigate('/staff/overview', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setServerError('Kullanıcı adı veya şifre hatalı.');
        } else if (err.status === 403) {
          setServerError(
            'Kurum aboneliği aktif değil (askıya alınmış veya süresi dolmuş). Lütfen kurum yöneticinizle iletişime geçin.'
          );
        } else if (err.message) {
          setServerError(err.message);
        } else {
          setServerError('Giriş işlemi başarısız oldu. Lütfen bilgilerinizi kontrol edin.');
        }
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.');
      }
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogIn className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle as="h1" className="text-2xl font-bold tracking-tight">
            LearnIQ Giriş
          </CardTitle>
          <CardDescription>
            Kurum hesabınıza erişmek için bilgilerinizi girin.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-4">
            {isExpired ? (
              <Alert
                title="Oturum Süresi Doldu"
                className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
              >
                Oturumunuzun süresi doldu. Güvenliğiniz için lütfen yeniden giriş yapın.
              </Alert>
            ) : null}

            {isSwitched ? (
              <Alert
                variant="default"
                title="Kurum Değiştirildi"
                className="border-primary/40 bg-primary/5 text-primary"
              >
                Farklı bir kuruma geçiş yapıldı. Lütfen yeni kurum hesabınızla giriş yapın.
              </Alert>
            ) : null}

            {serverError ? (
              <Alert variant="destructive" title="Giriş Başarısız">
                {serverError}
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="tenantId">Kurum (Tenant) Kodu</Label>
              <div className="relative">
                <Building2
                  className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="tenantId"
                  className="pl-9"
                  placeholder="ornek: ankara_fen_lisesi"
                  autoComplete="organization"
                  aria-invalid={errors.tenantId ? 'true' : 'false'}
                  aria-describedby={errors.tenantId ? 'tenantId-error' : undefined}
                  {...register('tenantId')}
                />
              </div>
              {errors.tenantId ? (
                <p id="tenantId-error" className="text-xs text-destructive">
                  {errors.tenantId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <div className="relative">
                <User
                  className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="username"
                  className="pl-9"
                  placeholder="Kullanıcı adınız"
                  autoComplete="username"
                  aria-invalid={errors.username ? 'true' : 'false'}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                  {...register('username')}
                />
              </div>
              {errors.username ? (
                <p id="username-error" className="text-xs text-destructive">
                  {errors.username.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <KeyRound
                  className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type="password"
                  className="pl-9"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
              </div>
              {errors.password ? (
                <p id="password-error" className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Giriş Yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              Platform yöneticisi misiniz?{' '}
              <Link
                to="/platform/login"
                className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
              >
                SUPER_ADMIN Girişi
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
