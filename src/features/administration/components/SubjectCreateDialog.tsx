import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookPlus, Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import {
  subjectSchema,
  type SubjectFormValues,
} from '../schemas/subjectSchemas';

export interface SubjectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SubjectFormValues) => Promise<void>;
}

export function SubjectCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: SubjectCreateDialogProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
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

  const handleFormSubmit = async (data: SubjectFormValues) => {
    setServerError(null);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Ders oluşturulamadı.');
      } else {
        setServerError('Ders oluşturulurken beklenmeyen bir hata oluştu.');
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
      title="Yeni Ders Ekle"
      description="Müfredat ve sınavlar için kurumunuza yeni bir ders tanımlayın."
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
          <Label htmlFor="create-subject-name">
            Ders Adı <span className="text-destructive">*</span>
          </Label>
          <Input
            id="create-subject-name"
            disabled={isSubmitting}
            placeholder="Örn: Fizik, Kimya, Geometri"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'subject-name-error' : undefined}
            {...register('name')}
          />
          {errors.name ? (
            <p id="subject-name-error" role="alert" className="text-xs text-destructive">
              {errors.name.message}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Ders adı kurum genelinde benzersiz olmalıdır.
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
              <BookPlus className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Dersi Kaydet</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

