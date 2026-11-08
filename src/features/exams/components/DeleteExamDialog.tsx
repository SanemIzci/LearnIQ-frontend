import * as React from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { useAppDispatch, useAppSelector } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import { examsApi } from '../api/examsApi';
import type { ExamResponse } from '@/types/api';

export interface DeleteExamDialogProps {
  exam: ExamResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteExamDialog({ exam, open, onOpenChange }: DeleteExamDialogProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setServerError(null);
      setIsDeleting(false);
    }
  }, [open]);

  if (!exam) return null;

  const handleDelete = async () => {
    setServerError(null);
    setIsDeleting(true);
    try {
      await examsApi.deleteExam(exam.id);
      await queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'exams'),
      });
      dispatch(
        pushToast({
          title: 'Sınav Silindi',
          description: `"${exam.title}" başarıyla silindi.`,
        })
      );
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Sınav silinirken bir hata oluştu.');
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Sınavı Sil"
      description="Bu işlem geri alınamaz ve sınavla ilişkili tüm verileri etkiler."
    >
      <div className="space-y-4">
        {serverError ? (
          <Alert variant="destructive" title="İşlem Başarısız">
            {serverError}
          </Alert>
        ) : null}

        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            <span>Dikkat: Sınav ve Öğrenci Sonuçları Silinecek</span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">
            <strong>"{exam.title}"</strong> sınavını silmek üzeresiniz. Bu sınava ait tüm ders eşleştirmeleri,
            öğrenci sınav sonuçları ve karneler kalıcı olarak silinecektir.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Siliniyor...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Evet, Sınavı Sil
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

