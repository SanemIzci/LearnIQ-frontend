import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Loader2, Mail, User } from 'lucide-react';
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
import {
  createGlobalUserSchema,
  type CreateGlobalUserFormValues,
} from '../schemas/platformSchemas';

export interface CreateGlobalUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGlobalUserDialog({ open, onOpenChange }: CreateGlobalUserDialogProps) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGlobalUserFormValues>({
    resolver: zodResolver(createGlobalUserSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset();
      setServerError(null);
    }
  }, [open, reset]);

  const onSubmit = async (data: CreateGlobalUserFormValues) => {
    setServerError(null);
    try {
      const newUser = await platformApi.createGlobalUser(data);
      await queryClient.invalidateQueries({
        queryKey: tenantQueryKey(null, 'global-users'),
      });
      dispatch(
        pushToast({
          title: 'Yönetici Oluşturuldu',
          description: `SUPER_ADMIN hesabı (${newUser.username}) başarıyla oluşturuldu.`,
        })
      );
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setServerError('Bu kullanıcı adı veya e-posta adresi zaten kullanılmaktadır.');
        } else if (err.message) {
          setServerError(err.message);
        } else {
          setServerError('Yönetici hesabı oluşturulamadı.');
        }
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen bağlantınızı kontrol edin.');
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Yeni Platform Yöneticisi Ekle"
      description="Merkezi LearnIQ platformu için tam yetkili SUPER_ADMIN hesabı tanımlayın."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError ? (
          <Alert variant="destructive" title="İşlem Başarısız">
            {serverError}
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="global-username">Yönetici Kullanıcı Adı *</Label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="global-username"
              className="pl-9"
              placeholder="platform_admin"
              aria-invalid={errors.username ? 'true' : 'false'}
              aria-describedby={errors.username ? 'global-user-err' : undefined}
              {...register('username')}
            />
          </div>
          {errors.username ? (
            <p id="global-user-err" className="text-xs text-destructive">
              {errors.username.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="global-email">E-posta Adresi *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="global-email"
              type="email"
              className="pl-9"
              placeholder="admin@learniq.internal"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'global-email-err' : undefined}
              {...register('email')}
            />
          </div>
          {errors.email ? (
            <p id="global-email-err" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="global-password">Şifre (en az 8 karakter) *</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="global-password"
              type="password"
              autoComplete="new-password"
              className="pl-9"
              placeholder="••••••••"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'global-pw-err' : undefined}
              {...register('password')}
            />
          </div>
          {errors.password ? (
            <p id="global-pw-err" className="text-xs text-destructive">
              {errors.password.message}
            </p>
          ) : null}
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
                Kaydediliyor...
              </>
            ) : (
              'Hesap Oluştur'
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

