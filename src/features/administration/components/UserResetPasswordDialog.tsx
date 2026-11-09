import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '../schemas/userSchemas';
import type { AdminUserSummary } from '@/types/api';

export interface UserResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUserSummary | null;
  onSubmit: (newPassword: string) => Promise<void>;
}

export function UserResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
}: UserResetPasswordDialogProps) {
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
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        newPassword: '',
        confirmPassword: '',
      });
      setServerError(null);
    }
  }, [open, reset]);

  if (!user) return null;

  const handleFormSubmit = async (data: ResetPasswordFormValues) => {
    setServerError(null);
    try {
      await onSubmit(data.newPassword);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Şifre sıfırlama işlemi başarısız oldu.');
      } else {
        setServerError('Şifre sıfırlanırken bir hata oluştu.');
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) {
          onOpenChange(nextOpen);
        }
      }}
      title="Kullanıcı Şifresini Sıfırla"
      description={`"${user.fullName}" (${user.username}) hesabı için yeni şifre belirleyin.`}
      className="max-w-md"
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        method="post"
        noValidate
        className="space-y-4"
      >
        {serverError ? (
          <div role="alert" aria-live="polite">
            <Alert variant="destructive" title="İşlem Hatası">
              {serverError}
            </Alert>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="reset-new-password">
            Yeni Şifre <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reset-new-password"
            type="password"
            disabled={isSubmitting}
            placeholder="En az 8 karakter"
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby={errors.newPassword ? 'reset-pwd-error' : undefined}
            {...register('newPassword')}
          />
          {errors.newPassword ? (
            <p id="reset-pwd-error" role="alert" className="text-xs text-destructive">
              {errors.newPassword.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reset-confirm-password">
            Yeni Şifre (Tekrar) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reset-confirm-password"
            type="password"
            disabled={isSubmitting}
            placeholder="Şifreyi tekrar giriniz"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'reset-confirm-pwd-error' : undefined}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <p id="reset-confirm-pwd-error" role="alert" className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            İptal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-1.5">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Şifreyi Güncelle</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

