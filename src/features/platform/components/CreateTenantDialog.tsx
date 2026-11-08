import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, KeyRound, Loader2, Mail, ShieldAlert, User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { ApiError } from '@/lib/api/error-parser';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { platformApi } from '../api/platformApi';
import { createTenantSchema, type CreateTenantFormValues } from '../schemas/platformSchemas';
import type { CreateTenantResponse } from '@/types/api';

export interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTenantDialog({ open, onOpenChange }: CreateTenantDialogProps) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [createdResult, setCreatedResult] = React.useState<CreateTenantResponse | null>(null);
  const [copied, setCopied] = React.useState(false);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTenantFormValues>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      id: '',
      name: '',
      domain: '',
      adminUsername: '',
      adminEmail: '',
      adminFullName: '',
      adminPassword: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset();
      setServerError(null);
      setCreatedResult(null);
      setCopied(false);
    }
  }, [open, reset]);

  const onSubmit = async (data: CreateTenantFormValues) => {
    setServerError(null);
    try {
      const response = await platformApi.provisionTenant({
        id: data.id,
        name: data.name,
        domain: data.domain || undefined,
        adminUsername: data.adminUsername,
        adminEmail: data.adminEmail || undefined,
        adminFullName: data.adminFullName || undefined,
        adminPassword: data.adminPassword || undefined,
      });

      await queryClient.invalidateQueries({
        queryKey: tenantQueryKey(null, 'tenants'),
      });

      if (response.temporaryPassword) {
        setCreatedResult(response);
      } else {
        dispatch(
          pushToast({
            title: 'Kurum Oluşturuldu',
            description: `${response.tenant.name} (${response.tenant.id}) kurumu başarıyla hazırlandı.`,
          })
        );
        onOpenChange(false);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setServerError('Bu kiracı kodu, alan adı veya yönetici kullanıcı adı zaten kullanılmaktadır.');
        } else if (err.message) {
          setServerError(err.message);
        } else {
          setServerError('Kurum provisioning işlemi başarısız oldu.');
        }
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen bağlantınızı kontrol edin.');
      }
    }
  };

  const handleCopyPassword = async () => {
    if (createdResult?.temporaryPassword && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(createdResult.temporaryPassword);
        setCopied(true);
        if (copyTimerRef.current) {
          clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback / ignore clipboard rejection in non-secure or restricted contexts
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={createdResult ? 'Kurum Hazırlandı' : 'Yeni Kurum (Tenant) Ekle'}
      description={
        createdResult
          ? 'Kurum ve veritabanı şeması başarıyla oluşturuldu.'
          : 'Yeni bir okul veya kurum için bağımsız veritabanı şeması ve ilk yönetici hesabını oluşturun.'
      }
    >
      {createdResult ? (
        <div className="space-y-4">
          <Alert variant="success" title="Provisioning Tamamlandı">
            <strong>{createdResult.tenant.name}</strong> ({createdResult.tenant.id}) kurumu ve şeması
            başarıyla kuruldu.
          </Alert>

          {createdResult.temporaryPassword ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-200 space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>Tek Seferlik Yönetici Geçici Şifresi</span>
              </div>
              <p className="text-xs">
                Bu şifre yalnızca şu anda görüntülenmektedir ve veritabanında geri döndürülemez şekilde hashlenmiştir. Lütfen kaydedin veya yöneticiye iletin:
              </p>
              <div className="flex items-center justify-between rounded border bg-card p-2 text-foreground font-mono text-sm font-bold">
                <span>{createdResult.temporaryPassword}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPassword}
                  className="h-8 gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      Kopyalandı
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Kopyala
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Yönetici kullanıcı adı: <strong>{createdResult.adminUsername}</strong>
              </p>
            </div>
          ) : null}

          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => onOpenChange(false)}>
              Kapat
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError ? (
            <Alert variant="destructive" title="İşlem Başarısız">
              {serverError}
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenant-id">Kiracı Kodu (Şema Adı) *</Label>
              <Input
                id="tenant-id"
                placeholder="ankara_fen"
                aria-invalid={errors.id ? 'true' : 'false'}
                aria-describedby={errors.id ? 'tenant-id-error' : undefined}
                {...register('id')}
              />
              {errors.id ? (
                <p id="tenant-id-error" className="text-xs text-destructive">
                  {errors.id.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-name">Kurum Adı *</Label>
              <Input
                id="tenant-name"
                placeholder="Ankara Fen Lisesi"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'tenant-name-error' : undefined}
                {...register('name')}
              />
              {errors.name ? (
                <p id="tenant-name-error" className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant-domain">Özel Alan Adı (Domain)</Label>
            <Input
              id="tenant-domain"
              placeholder="ankarafen.k12.tr (isteğe bağlı)"
              {...register('domain')}
            />
          </div>

          <div className="border-t pt-3 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              İlk Kurum Yöneticisi (ADMIN) Hesabı
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin-username">Yönetici Kullanıcı Adı *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-username"
                    className="pl-9"
                    placeholder="admin_ankara"
                    aria-invalid={errors.adminUsername ? 'true' : 'false'}
                    aria-describedby={errors.adminUsername ? 'admin-user-error' : undefined}
                    {...register('adminUsername')}
                  />
                </div>
                {errors.adminUsername ? (
                  <p id="admin-user-error" className="text-xs text-destructive">
                    {errors.adminUsername.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-email">Yönetici E-posta</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-email"
                    type="email"
                    className="pl-9"
                    placeholder="admin@okul.com"
                    aria-invalid={errors.adminEmail ? 'true' : 'false'}
                    aria-describedby={errors.adminEmail ? 'admin-email-error' : undefined}
                    {...register('adminEmail')}
                  />
                </div>
                {errors.adminEmail ? (
                  <p id="admin-email-error" className="text-xs text-destructive">
                    {errors.adminEmail.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin-fullname">Yönetici Ad Soyad</Label>
                <Input
                  id="admin-fullname"
                  placeholder="Ahmet Yılmaz"
                  {...register('adminFullName')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Yönetici Şifresi</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    placeholder="Boş bırakılırsa otomatik üretilir"
                    aria-invalid={errors.adminPassword ? 'true' : 'false'}
                    aria-describedby={errors.adminPassword ? 'admin-pw-error' : undefined}
                    {...register('adminPassword')}
                  />
                </div>
                {errors.adminPassword ? (
                  <p id="admin-pw-error" className="text-xs text-destructive">
                    {errors.adminPassword.message}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Boş bırakılırsa güvenli 14 karakterli geçici şifre üretilir.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Vazgeç
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Şema Hazırlanıyor...
                </>
              ) : (
                'Kurumu Oluştur'
              )}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
