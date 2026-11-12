import * as React from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import type { SubjectResponse } from '@/types/api';

export interface SubjectDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: SubjectResponse | null;
  onConfirm: (subjectId: string) => Promise<void>;
}

export function SubjectDeleteDialog({
  open,
  onOpenChange,
  subject,
  onConfirm,
}: SubjectDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setServerError(null);
      setIsDeleting(false);
    }
  }, [open]);

  if (!subject) return null;

  const handleDelete = async () => {
    setServerError(null);
    setIsDeleting(true);
    try {
      await onConfirm(subject.id);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Ders silinirken bir hata oluştu.');
      } else {
        setServerError('Ders silinirken bir hata oluştu.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isDeleting) {
          onOpenChange(nextOpen);
        }
      }}
      title="Dersi Sil"
      description="Bu işlem geri alınamaz ve derse ait konular ile sınav ilişkilerini etkileyebilir."
      className="max-w-md"
    >
      <div className="space-y-4">
        {serverError ? (
          <div role="alert" aria-live="polite">
            <Alert variant="destructive" title="Silme Hatası">
              {serverError}
            </Alert>
          </div>
        ) : null}

        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold">Dikkat</p>
            <p className="mt-0.5 text-muted-foreground">
              <strong className="text-foreground">{subject.name}</strong> dersini silmek istediğinize emin misiniz?
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            İptal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-1.5"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Siliniyor...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Dersi Sil</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

