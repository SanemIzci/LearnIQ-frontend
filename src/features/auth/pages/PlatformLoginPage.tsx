import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Loader2, ShieldCheck, User } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { setCredentials } from '@/store/authSlice';
import { apiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/error-parser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import type { AuthResponse } from '@/types/api';
import { platformLoginSchema, type PlatformLoginFormValues } from '../schemas/authSchemas';

export function PlatformLoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [serverError, setServerError] = React.useState<string | null>(null);

  const isExpired = searchParams.get('reason') === 'expired';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlatformLoginFormValues>({
    resolver: zodResolver(platformLoginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: PlatformLoginFormValues) => {
    setServerError(null);

    try {
      const response = await apiClient.post<AuthResponse>(
        '/api/v1/platform/auth/login',
        {
          username: data.username,
          password: data.password,
        },
        {
          skipAuth: true,
        }
      );

      dispatch(
        setCredentials({
          auth: response,
          tenantId: null,
        })
      );

      const fromState = (location.state as { from?: string } | null)?.from;
      if (fromState && fromState !== '/platform/login' && fromState.startsWith('/platform')) {
        navigate(fromState, { replace: true });
        return;
      }

      navigate('/platform/tenants', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setServerError('Platform yönetici kullanıcı adı veya şifresi hatalı.');
        } else if (err.message) {
          setServerError(err.message);
        } else {
          setServerError('Platform girişi başarısız oldu.');
        }
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.');
      }
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle as="h1" className="text-2xl font-bold tracking-tight">
            Platform SUPER_ADMIN
          </CardTitle>
          <CardDescription>
            LearnIQ merkezi sistem yönetimi ve kurum provisioning paneli.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-4">
            {isExpired ? (
              <Alert
                title="Oturum Süresi Doldu"
                className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
              >
                Güvenlik nedeniyle SUPER_ADMIN platform oturumunuzun süresi doldu (15 dk sınır). Lütfen yeniden giriş yapın.
              </Alert>
            ) : null}

            {serverError ? (
              <Alert variant="destructive" title="Giriş Başarısız">
                {serverError}
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="platform-username">Yönetici Kullanıcı Adı</Label>
              <div className="relative">
                <User
                  className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="platform-username"
                  className="pl-9"
                  placeholder="Platform kullanıcı adınız"
                  autoComplete="username"
                  aria-invalid={errors.username ? 'true' : 'false'}
                  aria-describedby={errors.username ? 'platform-username-error' : undefined}
                  {...register('username')}
                />
              </div>
              {errors.username ? (
                <p id="platform-username-error" className="text-xs text-destructive">
                  {errors.username.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform-password">Şifre</Label>
              <div className="relative">
                <KeyRound
                  className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="platform-password"
                  type="password"
                  className="pl-9"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'platform-password-error' : undefined}
                  {...register('password')}
                />
              </div>
              {errors.password ? (
                <p id="platform-password-error" className="text-xs text-destructive">
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
                  Doğrulanıyor...
                </>
              ) : (
                'Platforma Giriş Yap'
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              Normal kurum kullanıcısı mısınız?{' '}
              <Link
                to="/login"
                className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Kurum Girişine Dön
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
