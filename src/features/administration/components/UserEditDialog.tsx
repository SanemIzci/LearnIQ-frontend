import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserCog } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import {
  patchUserSchema,
  type PatchUserFormValues,
} from '../schemas/userSchemas';
import type { AdminUserSummary } from '@/types/api';

export interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUserSummary | null;
  onSubmit: (values: PatchUserFormValues) => Promise<void>;
}

export function UserEditDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
}: UserEditDialogProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatchUserFormValues>({
    resolver: zodResolver(patchUserSchema),
    defaultValues: {
      fullName: '',
      email: '',
      active: true,
    },
  });

  React.useEffect(() => {
    if (open && user) {
      reset({
        fullName: user.fullName,
        email: user.email,
        active: user.active,
      });
      setServerError(null);
    }
  }, [open, user, reset]);

  if (!user) return null;

  const handleFormSubmit = async (data: PatchUserFormValues) => {
    setServerError(null);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Kullanıcı güncellenemedi.');
      } else {
        setServerError('Kullanıcı güncellenirken bir hata oluştu.');
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
      title="Kullanıcı Bilgilerini Düzenle"
      description={`"${user.username}" (${user.role}) hesabını güncelleyin.`}
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
            <Alert variant="destructive" title="Güncelleme Hatası">
              {serverError}
            </Alert>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="edit-fullname">
            Ad Soyad <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-fullname"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? 'edit-fullname-error' : undefined}
            {...register('fullName')}
          />
          {errors.fullName ? (
            <p id="edit-fullname-error" role="alert" className="text-xs text-destructive">
              {errors.fullName.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-email">
            E-Posta Adresi <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-email"
            type="email"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'edit-email-error' : undefined}
            {...register('email')}
          />
          {errors.email ? (
            <p id="edit-email-error" role="alert" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-active">Hesap Durumu</Label>
          <Select
            id="edit-active"
            disabled={isSubmitting}
            {...register('active', {
              setValueAs: (val) => val === 'true' || val === true,
            })}
          >
            <option value="true">Aktif (Giriş Yapabilir)</option>
            <option value="false">Pasif (Erişimi Engellenmiş)</option>
          </Select>
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
              <UserCog className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Değişiklikleri Kaydet</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

