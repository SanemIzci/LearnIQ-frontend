import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, CheckCircle2, Info, Loader2, Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { ApiError } from '@/lib/api/error-parser';
import { studentPortalApi } from '../api/studentPortalApi';
import {
  defaultPenaltyDivisorForExamType,
  submitExamResultSchema,
  type SubmitExamResultFormValues,
} from '../schemas/studentPortalSchemas';
import type {
  ExamResponse,
  SubjectNetScoreDto,
  SubjectResponse,
} from '@/types/api';

export interface SubmitExamResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: ExamResponse | null;
  availableSubjects: SubjectResponse[];
  existingSubjectScores?: SubjectNetScoreDto[];
  onSuccess?: () => void;
}

export function SubmitExamResultDialog({
  open,
  onOpenChange,
  exam,
  availableSubjects,
  existingSubjectScores,
  onSuccess,
}: SubmitExamResultDialogProps) {
  const dispatch = useAppDispatch();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const effectiveSubjects = React.useMemo(() => {
    if (exam && Array.isArray(exam.subjects) && exam.subjects.length > 0) {
      return exam.subjects;
    }
    return availableSubjects;
  }, [exam, availableSubjects]);

  const penaltyDivisor = React.useMemo(
    () => defaultPenaltyDivisorForExamType(exam?.examType ?? 'TYT'),
    [exam?.examType]
  );

  const buildInitialRows = React.useCallback(() => {
    if (existingSubjectScores && existingSubjectScores.length > 0) {
      return existingSubjectScores.map((sr) => ({
        subjectId: sr.subjectId,
        subjectName: sr.subjectName,
        correctCount: sr.correctCount,
        wrongCount: sr.wrongCount,
      }));
    }

    if (exam && Array.isArray(exam.subjects) && exam.subjects.length > 0) {
      return exam.subjects.map((sub) => ({
        subjectId: sub.id,
        subjectName: sub.name,
        correctCount: 0,
        wrongCount: 0,
      }));
    }

    if (availableSubjects.length > 0) {
      return [
        {
          subjectId: availableSubjects[0].id,
          subjectName: availableSubjects[0].name,
          correctCount: 0,
          wrongCount: 0,
        },
      ];
    }

    return [
      {
        subjectId: '',
        subjectName: '',
        correctCount: 0,
        wrongCount: 0,
      },
    ];
  }, [exam, availableSubjects, existingSubjectScores]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubmitExamResultFormValues>({
    resolver: zodResolver(submitExamResultSchema),
    mode: 'onBlur',
    defaultValues: {
      subjects: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'subjects',
  });

  React.useEffect(() => {
    if (open && exam) {
      reset({
        subjects: buildInitialRows(),
      });
      setServerError(null);
    }
  }, [open, exam, reset, buildInitialRows]);

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

  if (!exam) return null;

  const watchedSubjects = watch('subjects') || [];

  const calculateRowNet = (correctRaw: unknown, wrongRaw: unknown): number => {
    const correct = Number(correctRaw);
    const wrong = Number(wrongRaw);
    if (!Number.isFinite(correct) || !Number.isFinite(wrong) || correct < 0 || wrong < 0) {
      return 0;
    }
    return correct - wrong / penaltyDivisor;
  };

  const estimatedTotalNet = watchedSubjects.reduce(
    (acc, row) => acc + calculateRowNet(row?.correctCount, row?.wrongCount),
    0
  );

  const hasPredefinedExamSubjects = Array.isArray(exam.subjects) && exam.subjects.length > 0;

  const onSubmit = async (data: SubmitExamResultFormValues) => {
    setServerError(null);

    try {
      await studentPortalApi.submitMyExamResult(exam.id, {
        subjects: data.subjects.map((row) => ({
          subjectId: row.subjectId,
          correctCount: Number(row.correctCount),
          wrongCount: Number(row.wrongCount),
        })),
      });

      dispatch(
        pushToast({
          title: 'Sınav Sonucunuz Gönderildi',
          description: `"${exam.title}" sınavı için doğru/yanlış sayılarınız öğretmen onayına (SUBMITTED) iletildi.`,
        })
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.message ||
            'Sonuç gönderilirken bir hata oluştu. Lütfen ders kurallarını ve soru sayılarını kontrol edin.'
        );
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSubmitting) return;
        onOpenChange(nextOpen);
      }}
      title="Manuel Sınav Sonucu Girişi"
      description={`"${exam.title}" (${exam.examType}) sınavı için ders bazlı doğru ve yanlış sayılarınızı giriniz.`}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} method="post" noValidate className="space-y-4">
        {serverError ? (
          <div role="alert" aria-live="polite">
            <Alert variant="destructive" title="Sonuç Gönderilemedi">
              {serverError}
            </Alert>
          </div>
        ) : null}

        {/* Verification & Approval Workflow Info */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Info className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
            <span>İki Aşamalı Doğrulama ve Öğretmen Onay Süreci</span>
          </div>
          <p>
            Girdiğiniz doğru ve yanlış sayıları sınav kurallarına göre kontrol edilir ve{' '}
            <strong className="text-foreground">İnceleme Bekliyor (SUBMITTED)</strong> olarak öğretmen onayına düşer.
            Öğretmeniniz tarafından gerekçeli olarak reddedilen (<strong className="text-foreground">REJECTED</strong>) sonuçlarınızı
            sınav açık olduğu sürece buradan düzeltip yeniden gönderebilirsiniz.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">
            Ders Bazlı Doğru / Yanlış Girişi ({penaltyDivisor} Yanlış 1 Doğruyu Götürür)
          </legend>
          {!hasPredefinedExamSubjects && effectiveSubjects.length > fields.length ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const usedIds = new Set(watchedSubjects.map((s) => s.subjectId));
                  const nextSub = effectiveSubjects.find((s) => !usedIds.has(s.id));
                  append({
                    subjectId: nextSub?.id ?? '',
                    subjectName: nextSub?.name ?? '',
                    correctCount: 0,
                    wrongCount: 0,
                  });
                }}
                disabled={isSubmitting}
                className="h-7 text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Ders Ekle
              </Button>
            </div>
          ) : null}

          {errors.subjects?.root?.message || typeof errors.subjects?.message === 'string' ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {errors.subjects?.root?.message || errors.subjects?.message}
            </p>
          ) : null}

          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
            {fields.map((field, index) => {
              const rowValues = watchedSubjects[index];
              const rowNet = calculateRowNet(rowValues?.correctCount, rowValues?.wrongCount);
              const rowErrors = errors.subjects?.[index];
              const subjectLabel =
                field.subjectName ||
                effectiveSubjects.find((s) => s.id === rowValues?.subjectId)?.name ||
                `Ders ${index + 1}`;

              return (
                <div
                  key={field.id}
                  className="rounded-lg border bg-muted/20 p-3 space-y-2"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
                    {/* Subject Column */}
                    <div className="sm:col-span-5 space-y-1">
                      {hasPredefinedExamSubjects ? (
                        <>
                          <span className="block text-xs font-medium text-foreground">
                            Ders
                          </span>
                          <div className="flex h-9 items-center rounded-md border bg-card px-3 text-sm font-medium text-foreground">
                            <input
                              type="hidden"
                              {...register(`subjects.${index}.subjectId`)}
                            />
                            <span>{subjectLabel}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <Label htmlFor={`subject-select-${index}`} className="text-xs">
                            Ders
                          </Label>
                          <Select
                            id={`subject-select-${index}`}
                            disabled={isSubmitting}
                            aria-invalid={Boolean(rowErrors?.subjectId)}
                            {...register(`subjects.${index}.subjectId`)}
                          >
                            <option value="">Ders seçiniz...</option>
                            {effectiveSubjects.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name}
                              </option>
                            ))}
                          </Select>
                        </>
                      )}
                    </div>

                    {/* Correct Count */}
                    <div className="sm:col-span-3 space-y-1">
                      <Label htmlFor={`correct-count-${index}`} className="text-xs">
                        Doğru Sayısı ({subjectLabel})
                      </Label>
                      <Input
                        id={`correct-count-${index}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(rowErrors?.correctCount)}
                        aria-describedby={
                          rowErrors?.correctCount ? `correct-error-${index}` : undefined
                        }
                        {...register(`subjects.${index}.correctCount`)}
                      />
                    </div>

                    {/* Wrong Count */}
                    <div className="sm:col-span-3 space-y-1">
                      <Label htmlFor={`wrong-count-${index}`} className="text-xs">
                        Yanlış Sayısı ({subjectLabel})
                      </Label>
                      <Input
                        id={`wrong-count-${index}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(rowErrors?.wrongCount)}
                        aria-describedby={
                          rowErrors?.wrongCount ? `wrong-error-${index}` : undefined
                        }
                        {...register(`subjects.${index}.wrongCount`)}
                      />
                    </div>

                    {/* Net Preview & Optional Delete */}
                    <div className="sm:col-span-1 flex items-center justify-between sm:justify-end gap-1 pb-1">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {rowNet.toFixed(2)}
                      </Badge>
                      {!hasPredefinedExamSubjects && fields.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          disabled={isSubmitting}
                          aria-label={`${subjectLabel} satırını kaldır`}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Field-level validation messages */}
                  {rowErrors?.subjectId ? (
                    <p role="alert" className="text-xs text-destructive">
                      {rowErrors.subjectId.message}
                    </p>
                  ) : null}
                  {rowErrors?.correctCount ? (
                    <p
                      id={`correct-error-${index}`}
                      role="alert"
                      className="text-xs text-destructive"
                    >
                      {rowErrors.correctCount.message}
                    </p>
                  ) : null}
                  {rowErrors?.wrongCount ? (
                    <p
                      id={`wrong-error-${index}`}
                      role="alert"
                      className="text-xs text-destructive"
                    >
                      {rowErrors.wrongCount.message}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </fieldset>

        {/* Estimated Total Net Footer */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Tahmini Toplam Net (Kesin net backend kuralına göre hesaplanır):</span>
          </div>
          <span className="font-mono text-base font-bold text-foreground">
            {estimatedTotalNet.toFixed(2)} Net
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
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
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            Sonuçları Onaya Gönder
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
