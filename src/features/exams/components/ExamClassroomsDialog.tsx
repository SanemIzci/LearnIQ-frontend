import * as React from 'react';
import { Check, GraduationCap, Loader2, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { useAppDispatch, useAppSelector } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import { examsApi, useClassroomsQuery } from '../api/examsApi';
import type { ExamResponse } from '@/types/api';

export interface ExamClassroomsDialogProps {
  exam: ExamResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExamUpdated?: (updatedExam: ExamResponse) => void;
}

export function ExamClassroomsDialog({ exam, open, onOpenChange, onExamUpdated }: ExamClassroomsDialogProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  const { data: allClassrooms = [], isLoading: isLoadingClassrooms } = useClassroomsQuery();

  const [activeExam, setActiveExam] = React.useState<ExamResponse | null>(exam);
  const [selectedClassroomId, setSelectedClassroomId] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setActiveExam(exam);
  }, [exam]);

  React.useEffect(() => {
    if (open) {
      setSelectedClassroomId('');
      setServerError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const currentExam = activeExam || exam;
  if (!currentExam) return null;

  const isFinalized = currentExam.status === 'FINALIZED';
  const assignedClassroomIds = new Set(currentExam.classroomIds || []);
  const availableClassrooms = allClassrooms.filter((c) => !assignedClassroomIds.has(c.id));

  const handleAssignClassroom = async () => {
    if (!selectedClassroomId) return;

    const classroomObj = allClassrooms.find((c) => c.id === selectedClassroomId);
    const classroomName = classroomObj?.name || 'Sınıf';

    setIsSubmitting(true);
    setServerError(null);

    try {
      const updated = await examsApi.assignClassroom(currentExam.id, selectedClassroomId);
      setActiveExam(updated);
      onExamUpdated?.(updated);

      await queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'exams'),
      });
      dispatch(
        pushToast({
          title: 'Sınıf Atandı',
          description: `"${classroomName}" sınıfı sınava başarıyla dahil edildi.`,
        })
      );
      setSelectedClassroomId('');
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Sınıf atanamadı.');
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassignClassroom = async (classroomId: string) => {
    const classroomObj = allClassrooms.find((c) => c.id === classroomId);
    const classroomName = classroomObj?.name || 'Sınıf';

    setIsSubmitting(true);
    setServerError(null);

    try {
      const updated = await examsApi.unassignClassroom(currentExam.id, classroomId);
      setActiveExam(updated);
      onExamUpdated?.(updated);

      await queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'exams'),
      });
      dispatch(
        pushToast({
          title: 'Sınıf Kaldırıldı',
          description: `"${classroomName}" sınıfı sınavdan çıkarıldı.`,
        })
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Sınıf sınavdan çıkarılamadı.');
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
      onOpenChange={onOpenChange}
      title="Sınav Sınıf Atamaları"
      description={`"${currentExam.title}" sınavına dahil edilecek sınıfları belirleyin.`}
    >
      <div className="space-y-4">
        {serverError ? (
          <Alert variant="destructive" title="İşlem Başarısız">
            {serverError}
          </Alert>
        ) : null}

        {isFinalized ? (
          <Alert variant="default" title="Sınav Kesinleştirildi">
            Kesinleştirilmiş bir sınavın sınıf atamaları değiştirilemez.
          </Alert>
        ) : null}

        {/* Assign Classroom Section */}
        {!isFinalized ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Select
                aria-label="Sınava Eklenecek Sınıfı Seçin"
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                disabled={isSubmitting || isLoadingClassrooms}
              >
                <option value="">
                  {isLoadingClassrooms
                    ? 'Sınıflar yükleniyor...'
                    : availableClassrooms.length === 0
                      ? 'Tüm mevcut sınıflar zaten atandı'
                      : 'Sınava atanacak sınıfı seçin...'}
                </option>
                {availableClassrooms.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              onClick={handleAssignClassroom}
              disabled={!selectedClassroomId || isSubmitting}
              className="gap-1.5 shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              Sınıfı Ata
            </Button>
          </div>
        ) : null}

        {/* Assigned Classrooms List */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sınava Dahil Sınıflar ({currentExam.classroomIds?.length || 0})
          </h4>

          {!currentExam.classroomIds || currentExam.classroomIds.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              <GraduationCap className="mx-auto mb-2 h-7 w-7 opacity-40" aria-hidden="true" />
              Bu sınava henüz sınıf atanmamış.
            </div>
          ) : (
            <div className="divide-y rounded-lg border bg-card">
              {currentExam.classroomIds.map((classroomId) => {
                const classroomObj = allClassrooms.find((c) => c.id === classroomId);
                const displayName = classroomObj?.name || `Sınıf ID: ${classroomId.slice(0, 8)}...`;

                return (
                  <div
                    key={classroomId}
                    className="flex items-center justify-between p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      <span className="font-medium text-foreground">{displayName}</span>
                    </div>

                    {!isFinalized ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnassignClassroom(classroomId)}
                        disabled={isSubmitting}
                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                        aria-label={`${displayName} sınıfını sınavdan kaldır`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Kaldır
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

