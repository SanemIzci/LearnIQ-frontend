import * as React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { ApiError } from '@/lib/api/error-parser';
import { examsApi } from '../api/examsApi';
import type { ExamResponse } from '@/types/api';

export interface FinalizeExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: ExamResponse | null;
  pendingResultsCount?: number;
  onSuccess?: () => void;
}

export function FinalizeExamDialog({
  open,
  onOpenChange,
  exam,
  pendingResultsCount = 0,
  onSuccess,
}: FinalizeExamDialogProps) {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setServerError(null);
      setIsSubmitting(false);
    }
  }, [open]);

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

  const handleFinalize = async () => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      await examsApi.finalizeExam(exam.id);
      dispatch(
        pushToast({
          title: 'Sınav Kesinleştirildi',
          description: `"${exam.title}" sınavı başarıyla kesinleştirildi. Sıralama ve yüzdelik dilimler hesaplandı.`,
        })
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Sınav kesinleştirilirken bir hata oluştu.');
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSubmitting) return;
        onOpenChange(nextOpen);
      }}
      title="Sınavı Kesinleştir"
      description={`"${exam.title}" sınavını sonlandırmak ve kesinleştirmek üzeresiniz.`}
    >
      <div className="space-y-4">
        {serverError ? (
          <Alert variant="destructive" title="İşlem Başarısız">
            {serverError}
          </Alert>
        ) : null}

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm space-y-2">
          <div className="flex items-center gap-2 font-medium text-primary">
            <Lock className="h-4 w-4" aria-hidden="true" />
            <span>Kesinleştirme Sürecinde Gerçekleşecek İşlemler:</span>
          </div>
          <ul className="text-xs space-y-1.5 text-muted-foreground list-disc list-inside">
            <li>Sınav durumu kalıcı olarak <strong className="text-foreground">KESİNLEŞTİRİLDİ</strong> olarak işaretlenir.</li>
            <li>Onaylanmış tüm öğrenci sonuçları için <strong className="text-foreground">okul sıralaması, sınıf sıralaması ve yüzdelik dilim</strong> hesaplanır.</li>
            <li>Öğrenciler sınav karnelerine ve AI değerlendirme raporlarına erişebilir hale gelir.</li>
            <li>Sınav bilgileri, ders ve sınıf eşleştirmeleri artık düzenlenemez veya silinemez.</li>
          </ul>
        </div>

        {pendingResultsCount > 0 ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold">Dikkat:</span> Bu sınavda henüz incelenmemiş{' '}
              <span className="font-bold underline">{pendingResultsCount} adet onay bekleyen sonuç</span> bulunmaktadır.
              Kesinleştirme işlemi yalnızca onaylanmış sonuçları sıralamaya dahil edecektir.
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>İnceleme bekleyen sonuç kalmamıştır. Sınav güvenle kesinleştirilebilir.</span>
          </div>
        )}

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
            type="button"
            variant="default"
            onClick={handleFinalize}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Lock className="h-4 w-4" aria-hidden="true" />
            )}
            Evet, Sınavı Kesinleştir
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

