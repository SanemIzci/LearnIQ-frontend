import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { ApiError } from '@/lib/api/error-parser';
import { examsApi } from '../api/examsApi';
import { rejectResultSchema, type RejectResultFormValues } from '../schemas/examSchemas';
import type { StudentExamResult } from '@/types/api';

export interface RejectResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  result: StudentExamResult | null;
  onSuccess?: () => void;
}

export function RejectResultDialog({
  open,
  onOpenChange,
  examId,
  result,
  onSuccess,
}: RejectResultDialogProps) {
  const dispatch = useAppDispatch();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RejectResultFormValues>({
    resolver: zodResolver(rejectResultSchema),
    defaultValues: {
      reason: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({ reason: '' });
      setServerError(null);
    }
  }, [open, reset]);

  React.useEffect(() => {
    if (!isSubmitting) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isSubmitting]);

  if (!result) return null;

  const onSubmit = async (data: RejectResultFormValues) => {
    setServerError(null);
    try {
      await examsApi.rejectResult(examId, result.id, { reason: data.reason });
      dispatch(
        pushToast({
          title: 'Sonuç Reddedildi',
          description: 'Öğrenci sınav sonucu gerekçeli olarak reddedildi.',
        })
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Sonuç reddedilirken bir hata oluştu.');
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Sınav Sonucunu Reddet"
      description={`#${result.studentId.slice(0, 8)}... ID'li öğrencinin sonucunu gerekçe belirterek reddedin.`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError ? (
          <Alert variant="destructive" title="İşlem Başarısız">
            {serverError}
          </Alert>
        ) : null}

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Reddedilen sonuç öğrenci panelinde gerekçesiyle birlikte görünecektir. Öğrenci doğru/yanlış girişlerini düzenleyip tekrar onaya gönderebilir.
          </span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rejection-reason">Reddetme Gerekçesi *</Label>
          <textarea
            id="rejection-reason"
            rows={4}
            className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Örn: Optik form ile ders soru sayıları uyuşmuyor, lütfen kontrol ediniz..."
            aria-invalid={errors.reason ? 'true' : 'false'}
            aria-describedby={errors.reason ? 'rejection-reason-err' : undefined}
            {...register('reason')}
          />
          {errors.reason ? (
            <p id="rejection-reason-err" className="text-xs font-medium text-destructive">
              {errors.reason.message}
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
          <Button
            type="submit"
            variant="destructive"
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Gerekçeli Reddet
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
