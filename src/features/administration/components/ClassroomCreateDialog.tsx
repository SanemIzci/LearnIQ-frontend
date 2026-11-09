import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import {
  createClassroomSchema,
  type CreateClassroomFormValues,
} from '../schemas/classroomSchemas';

export interface ClassroomCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateClassroomFormValues) => Promise<void>;
}

export function ClassroomCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: ClassroomCreateDialogProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateClassroomFormValues>({
    resolver: zodResolver(createClassroomSchema),
    defaultValues: {
      name: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({ name: '' });
      setServerError(null);
    }
  }, [open, reset]);

  const handleFormSubmit = async (data: CreateClassroomFormValues) => {
    setServerError(null);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Sınıf oluşturulamadı.');
      } else {
        setServerError('Sınıf oluşturulurken beklenmeyen bir hata oluştu.');
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
      title="Yeni Sınıf & Şube Tanımla"
      description="Kurumunuza yeni bir sınıf grubu (şube) ekleyin."
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
            <Alert variant="destructive" title="Kayıt Hatası">
              {serverError}
            </Alert>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="create-classroom-name">
            Sınıf / Şube Adı <span className="text-destructive">*</span>
          </Label>
          <Input
            id="create-classroom-name"
            disabled={isSubmitting}
            placeholder="Örn: 12-A Sayısal, 11-B Eşit Ağırlık"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'cls-name-error' : undefined}
            {...register('name')}
          />
          {errors.name ? (
            <p id="cls-name-error" role="alert" className="text-xs text-destructive">
              {errors.name.message}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Sınıf adı öğrenciler ve öğretmenler tarafından listelerde görünecektir.
            </p>
          )}
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
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Sınıfı Oluştur</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

