import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, FileText, Loader2, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { useAppDispatch, useAppSelector } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import { examsApi } from '../api/examsApi';
import { updateExamSchema, type UpdateExamFormValues } from '../schemas/examSchemas';
import type { ExamResponse } from '@/types/api';

export interface EditExamDialogProps {
  exam: ExamResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditExamDialog({ exam, open, onOpenChange }: EditExamDialogProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateExamFormValues>({
    resolver: zodResolver(updateExamSchema),
  });

  React.useEffect(() => {
    if (exam && open) {
      reset({
        title: exam.title,
        examDate: exam.examDate,
        examType: exam.examType,
      });
      setServerError(null);
    }
  }, [exam, open, reset]);

  if (!exam) return null;

  const isFinalized = exam.status === 'FINALIZED';

  const onSubmit = async (data: UpdateExamFormValues) => {
    setServerError(null);
    try {
      const updated = await examsApi.updateExam(exam.id, data);
      await queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'exams'),
      });
      dispatch(
        pushToast({
          title: 'Sınav Güncellendi',
          description: `"${updated.title}" başarıyla güncellendi.`,
        })
      );
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Sınav güncellenirken bir hata oluştu.');
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Sınavı Düzenle"
      description={`"${exam.title}" sınav bilgilerini güncelleyin.`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {isFinalized ? (
          <Alert variant="default" title="Sınav Kesinleştirildi">
            Bu sınav kesinleştirilmiştir. Kesinleştirilmiş sınavlarda değişiklik yapılamaz.
          </Alert>
        ) : null}

        {serverError ? (
          <Alert variant="destructive" title="İşlem Başarısız">
            {serverError}
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="edit-exam-title">Güncel Sınav Adı *</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="edit-exam-title"
              className="pl-9"
              disabled={isFinalized}
              aria-invalid={errors.title ? 'true' : 'false'}
              aria-describedby={errors.title ? 'edit-exam-title-err' : undefined}
              {...register('title')}
            />
          </div>
          {errors.title ? (
            <p id="edit-exam-title-err" className="text-xs text-destructive">
              {errors.title.message}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-exam-type">Sınav Türü / Tipi *</Label>
            <div className="relative">
              <Select id="edit-exam-type" disabled={isFinalized} {...register('examType')}>
                <option value="TYT">TYT (Temel Yeterlilik Testi)</option>
                <option value="AYT">AYT (Alan Yeterlilik Testi)</option>
                <option value="YKS">YKS (Yükseköğretim Kurumları Sınavı)</option>
                <option value="LGS">LGS (Liselere Geçiş Sistemi)</option>
                <option value="DENEME">Genel Kurum Denemesi</option>
                <option value="KTT">KTT (Konu Tarama Testi)</option>
              </Select>
            </div>
            {errors.examType ? (
              <p className="text-xs text-destructive">{errors.examType.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-exam-date">Sınav Tarihi *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="edit-exam-date"
                type="date"
                className="pl-9"
                disabled={isFinalized}
                aria-invalid={errors.examDate ? 'true' : 'false'}
                aria-describedby={errors.examDate ? 'edit-exam-date-err' : undefined}
                {...register('examDate')}
              />
            </div>
            {errors.examDate ? (
              <p id="edit-exam-date-err" className="text-xs text-destructive">
                {errors.examDate.message}
              </p>
            ) : null}
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
          <Button type="submit" disabled={isSubmitting || isFinalized} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                Güncellemeleri Kaydet
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
