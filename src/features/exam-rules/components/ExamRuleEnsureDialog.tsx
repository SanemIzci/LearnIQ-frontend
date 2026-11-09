import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Calculator, Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { ApiError } from '@/lib/api/error-parser';
import { useUpsertExamRuleMutation } from '../api/examRulesApi';
import { examRuleSchema, type ExamRuleFormValues } from '../schemas/examRuleSchema';

export interface ExamRuleEnsureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examType: string;
  subjectId: string;
  subjectName: string;
  onRuleEnsured: () => Promise<void> | void;
}

export function ExamRuleEnsureDialog({
  open,
  onOpenChange,
  examType,
  subjectId,
  subjectName,
  onRuleEnsured,
}: ExamRuleEnsureDialogProps) {
  const dispatch = useAppDispatch();
  const upsertRuleMutation = useUpsertExamRuleMutation();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const defaultDivisor = examType?.toUpperCase().includes('LGS') ? 3.0 : 4.0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExamRuleFormValues>({
    resolver: zodResolver(examRuleSchema),
    defaultValues: {
      questionCount: 40,
      penaltyDivisor: defaultDivisor,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        questionCount: 40,
        penaltyDivisor: defaultDivisor,
      });
      setServerError(null);
    }
  }, [open, examType, defaultDivisor, reset]);

  const onSubmit = async (data: ExamRuleFormValues) => {
    setServerError(null);
    try {
      await upsertRuleMutation.mutateAsync({
        examType,
        subjectId,
        data: {
          questionCount: Number(data.questionCount),
          penaltyDivisor: Number(data.penaltyDivisor),
        },
      });

      dispatch(
        pushToast({
          title: 'Sınav Kuralı Tanımlandı',
          description: `${examType} için ${subjectName} dersi net hesaplama kuralı kaydedildi.`,
        })
      );

      // Execute subsequent action (e.g. attach subject to exam)
      await onRuleEnsured();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Sınav kuralı kaydedilemedi.');
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Net Hesaplama Kuralı Tanımla"
      description={`"${subjectName}" dersinin "${examType}" sınavında kullanılabilmesi için soru sayısı ve net ceza katsayısı gereklidir.`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError ? (
          <Alert variant="destructive" title="İşlem Başarısız">
            {serverError}
          </Alert>
        ) : null}

        <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{subjectName}</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-semibold text-primary">{examType}</span>
          </div>
          <p className="text-muted-foreground">
            Öğrencilerin doğru/yanlış giriş yapabilmesi ve netlerinin doğru hesaplanabilmesi için bu kural zorunludur.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rule-question-count">Toplam Soru Sayısı *</Label>
            <Input
              id="rule-question-count"
              type="number"
              min={1}
              aria-invalid={errors.questionCount ? 'true' : 'false'}
              aria-describedby={errors.questionCount ? 'rule-qcount-err' : undefined}
              {...register('questionCount', { valueAsNumber: true })}
            />
            {errors.questionCount ? (
              <p id="rule-qcount-err" role="alert" className="text-xs text-destructive">
                {errors.questionCount.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-penalty-divisor">Ceza Katsayısı (Kaç yanlış 1 doğru) *</Label>
            <div className="relative">
              <Select
                id="rule-penalty-divisor"
                aria-invalid={Boolean(errors.penaltyDivisor)}
                aria-describedby={errors.penaltyDivisor ? 'rule-penalty-divisor-err' : undefined}
                {...register('penaltyDivisor', { valueAsNumber: true })}
              >
                <option value={4.0}>4.0 (TYT / AYT / YKS standardı: 4 yanlış 1 doğru)</option>
                <option value={3.0}>3.0 (LGS standardı: 3 yanlış 1 doğru)</option>
                <option value={1.0}>1.0 (Yanlış doğruyu götürmez: 0 ceza / 1.0)</option>
              </Select>
            </div>
            {errors.penaltyDivisor ? (
              <p id="rule-penalty-divisor-err" role="alert" className="text-xs text-destructive">
                {errors.penaltyDivisor.message}
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
                Kaydediliyor...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4" aria-hidden="true" />
                Kuralı Kaydet ve Dersi Ekle
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

