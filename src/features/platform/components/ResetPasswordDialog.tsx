import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Loader2 } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import { platformApi } from '../api/platformApi';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../schemas/platformSchemas';
import type { GlobalUserSummary } from '@/types/api';

export interface ResetPasswordDialogProps {
  user: GlobalUserSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResetPasswordDialog({ user, open, onOpenChange }: ResetPasswordDialogProps) {
  const dispatch = useAppDispatch();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset();
      setServerError(null);
    }
  }, [open, reset]);

  if (!user) return null;

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setServerError(null);
    try {
      await platformApi.resetGlobalUserPassword(user.id, data.newPassword);
      dispatch(
        pushToast({
          title: 'Şifre Güncellendi',
          description: `${user.username} kullanıcısının şifresi başarıyla sıfırlandı.`,
        })
      );
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setServerError('Kullanıcı bulunamadı.');
        } else if (err.message) {
          setServerError(err.message);
        } else {
          setServerError('Şifre sıfırlanırken bir hata oluştu.');
        }
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Yönetici Şifresini Sıfırla"
      description={`${user.username} (${user.email}) hesabı için yeni bir şifre belirleyin.`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError ? (
          <Alert variant="destructive" title="İşlem Başarısız">
            {serverError}
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="reset-new-password">Yeni Şifre (en az 8 karakter) *</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="reset-new-password"
              type="password"
              autoComplete="new-password"
              className="pl-9"
              placeholder="••••••••"
              aria-invalid={errors.newPassword ? 'true' : 'false'}
              aria-describedby={errors.newPassword ? 'reset-pw-err' : undefined}
              {...register('newPassword')}
            />
          </div>
          {errors.newPassword ? (
            <p id="reset-pw-err" className="text-xs text-destructive">
              {errors.newPassword.message}
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
                Güncelleniyor...
              </>
            ) : (
              'Şifreyi Güncelle'
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

