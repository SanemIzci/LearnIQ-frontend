import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserPlus } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import {
  registerUserSchema,
  type RegisterUserFormValues,
} from '../schemas/userSchemas';

export interface UserRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RegisterUserFormValues) => Promise<void>;
}

export function UserRegisterDialog({
  open,
  onOpenChange,
  onSubmit,
}: UserRegisterDialogProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterUserFormValues>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      username: '',
      fullName: '',
      email: '',
      password: '',
      role: 'STUDENT',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        username: '',
        fullName: '',
        email: '',
        password: '',
        role: 'STUDENT',
      });
      setServerError(null);
    }
  }, [open, reset]);

  const handleFormSubmit = async (data: RegisterUserFormValues) => {
    setServerError(null);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Kullanıcı kaydı başarısız oldu.');
      } else {
        setServerError('Kullanıcı kaydedilirken beklenmeyen bir hata oluştu.');
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
      title="Yeni Kurum Kullanıcısı Ekle"
      description="Kurumunuza yeni bir öğretmen, öğrenci veya yönetici hesabı tanımlayın."
      className="max-w-lg"
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        method="post"
        noValidate
        className="space-y-4"
      >
        {serverError ? (
          <div role="alert" aria-live="polite">
            <Alert variant="destructive" title="Kayıt Hatası">
              {serverError}
            </Alert>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Full Name */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="reg-fullname">
              Ad Soyad <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reg-fullname"
              disabled={isSubmitting}
              placeholder="Örn: Ahmet Yılmaz"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'reg-fullname-error' : undefined}
              {...register('fullName')}
            />
            {errors.fullName ? (
              <p id="reg-fullname-error" role="alert" className="text-xs text-destructive">
                {errors.fullName.message}
              </p>
            ) : null}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-username">
              Kullanıcı Adı <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reg-username"
              disabled={isSubmitting}
              placeholder="ahmet.yilmaz"
              aria-invalid={Boolean(errors.username)}
              aria-describedby={errors.username ? 'reg-username-error' : undefined}
              {...register('username')}
            />
            {errors.username ? (
              <p id="reg-username-error" role="alert" className="text-xs text-destructive">
                {errors.username.message}
              </p>
            ) : null}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-role">
              Kullanıcı Rolü <span className="text-destructive">*</span>
            </Label>
            <Select
              id="reg-role"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.role)}
              aria-describedby={errors.role ? 'reg-role-error' : undefined}
              {...register('role')}
            >
              <option value="STUDENT">Öğrenci (STUDENT)</option>
              <option value="TEACHER">Öğretmen (TEACHER)</option>
              <option value="ADMIN">Kurum Yöneticisi (ADMIN)</option>
            </Select>
            {errors.role ? (
              <p id="reg-role-error" role="alert" className="text-xs text-destructive">
                {errors.role.message}
              </p>
            ) : null}
          </div>

          {/* Email */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="reg-email">
              E-Posta Adresi <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reg-email"
              type="email"
              disabled={isSubmitting}
              placeholder="ahmet@okul.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'reg-email-error' : undefined}
              {...register('email')}
            />
            {errors.email ? (
              <p id="reg-email-error" role="alert" className="text-xs text-destructive">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          {/* Password */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="reg-password">
              Başlangıç Şifresi <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reg-password"
              type="password"
              disabled={isSubmitting}
              placeholder="En az 8 karakter"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'reg-password-error' : undefined}
              {...register('password')}
            />
            {errors.password ? (
              <p id="reg-password-error" role="alert" className="text-xs text-destructive">
                {errors.password.message}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Kullanıcı bu şifre ile ilk girişini yapabilir.
              </p>
            )}
          </div>
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
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Kullanıcıyı Kaydet</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

