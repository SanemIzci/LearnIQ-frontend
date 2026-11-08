import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, FileText, Loader2, Sparkles } from 'lucide-react';
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
import { createExamSchema, type CreateExamFormValues } from '../schemas/examSchemas';

export interface CreateExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateExamDialog({ open, onOpenChange }: CreateExamDialogProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Default to today's date in YYYY-MM-DD (local timezone)
  const today = new Intl.DateTimeFormat('en-CA').format(new Date());

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateExamFormValues>({
    resolver: zodResolver(createExamSchema),
    defaultValues: {
      title: '',
      examDate: today,
      examType: 'TYT',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        title: '',
        examDate: today,
        examType: 'TYT',
      });
      setServerError(null);
    }
  }, [open, reset, today]);

  const onSubmit = async (data: CreateExamFormValues) => {
    setServerError(null);
    try {
      const created = await examsApi.createExam(data);
      await queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'exams'),
      });
      dispatch(
        pushToast({
          title: 'Sınav Oluşturuldu',
          description: `"${created.title}" başarıyla oluşturuldu. Ders ve sınıfları ekleyebilirsiniz.`,
        })
      );
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Sınav oluşturulurken bir hata oluştu.');
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Yeni Sınav Oluştur"
      description="Öğrenciler için yeni bir deneme veya konu tarama sınavı tanımlayın."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError ? (
          <Alert variant="destructive" title="İşlem Başarısız">
            {serverError}
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="exam-title">Sınav Adı *</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="exam-title"
              className="pl-9"
              placeholder="Örn: 2026 Türkiye Geneli TYT Deneme-1"
              aria-invalid={errors.title ? 'true' : 'false'}
              aria-describedby={errors.title ? 'exam-title-err' : undefined}
              {...register('title')}
            />
          </div>
          {errors.title ? (
            <p id="exam-title-err" className="text-xs text-destructive">
              {errors.title.message}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="exam-type">Sınav Türü / Tipi *</Label>
            <div className="relative">
              <Select id="exam-type" {...register('examType')}>
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
            <Label htmlFor="exam-date">Sınav Tarihi *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="exam-date"
                type="date"
                className="pl-9"
                aria-invalid={errors.examDate ? 'true' : 'false'}
                aria-describedby={errors.examDate ? 'exam-date-err' : undefined}
                {...register('examDate')}
              />
            </div>
            {errors.examDate ? (
              <p id="exam-date-err" className="text-xs text-destructive">
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
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Oluşturuluyor...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Sınavı Oluştur
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

