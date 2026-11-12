import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import {
  subjectSchema,
  type SubjectFormValues,
} from '../schemas/subjectSchemas';
import type { SubjectResponse } from '@/types/api';

export interface SubjectEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: SubjectResponse | null;
  onSubmit: (values: SubjectFormValues) => Promise<void>;
}

export function SubjectEditDialog({
  open,
  onOpenChange,
  subject,
  onSubmit,
}: SubjectEditDialogProps) {
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
    if (open && subject) {
      reset({ name: subject.name });
      setServerError(null);
    }
  }, [open, subject, reset]);

  const handleFormSubmit = async (data: SubjectFormValues) => {
    setServerError(null);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Ders güncellenemedi.');
      } else {
        setServerError('Ders güncellenirken bir hata oluştu.');
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
      title="Dersi Düzenle"
      description={
        subject
          ? `"${subject.name}" dersinin adını güncelleyin.`
          : 'Ders bilgilerini güncelleyin.'
      }
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
          <Label htmlFor="edit-subject-name">
            Ders Adı <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-subject-name"
            disabled={isSubmitting}
            placeholder="Örn: Fizik, Kimya, Geometri"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'edit-subject-name-error' : undefined}
            {...register('name')}
          />
          {errors.name ? (
            <p id="edit-subject-name-error" role="alert" className="text-xs text-destructive">
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
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span>Güncelle</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

