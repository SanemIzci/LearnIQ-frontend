import * as React from 'react';
import { BookOpen, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { useAppDispatch, useAppSelector } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import { examsApi, useSubjectsQuery } from '../api/examsApi';
import { examRulesApi, ExamRuleEnsureDialog } from '@/features/exam-rules';
import type { ExamResponse, SubjectResponse } from '@/types/api';

export interface ExamSubjectsDialogProps {
  exam: ExamResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExamUpdated?: (updatedExam: ExamResponse) => void;
}

export function ExamSubjectsDialog({ exam, open, onOpenChange, onExamUpdated }: ExamSubjectsDialogProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  const { data: allSubjects = [], isLoading: isLoadingSubjects } = useSubjectsQuery();

  const [activeExam, setActiveExam] = React.useState<ExamResponse | null>(exam);
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Satır içi kural tanımlama modalı için durum
  const [ensureRuleOpen, setEnsureRuleOpen] = React.useState(false);
  const [subjectNeedingRule, setSubjectNeedingRule] = React.useState<SubjectResponse | null>(null);

  React.useEffect(() => {
    setActiveExam(exam);
  }, [exam]);

  React.useEffect(() => {
    if (open) {
      setSelectedSubjectId('');
      setServerError(null);
      setIsSubmitting(false);
      setEnsureRuleOpen(false);
      setSubjectNeedingRule(null);
    }
  }, [open]);

  const currentExam = activeExam || exam;
  if (!currentExam) return null;

  const isFinalized = currentExam.status === 'FINALIZED';
  const assignedSubjectIds = new Set((currentExam.subjects || []).map((s) => s.id));
  const availableSubjects = allSubjects.filter((s) => !assignedSubjectIds.has(s.id));

  const handleAddSubjectDirectly = async (subjectId: string, subjectName: string) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const updated = await examsApi.addSubject(currentExam.id, subjectId);
      setActiveExam(updated);
      onExamUpdated?.(updated);

      await queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'exams'),
      });
      dispatch(
        pushToast({
          title: 'Ders Eklendi',
          description: `"${subjectName}" dersi sınava başarıyla eklendi.`,
        })
      );
      setSelectedSubjectId('');
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Ders eklenemedi.');
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubjectClick = async () => {
    if (!selectedSubjectId) return;

    const subjectObj = allSubjects.find((s) => s.id === selectedSubjectId);
    if (!subjectObj) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      // 1. Bu sınav tipi için dersin net kuralı var mı kontrol et
      const existingRules = await examRulesApi.fetchRules(currentExam.examType);
      const hasRule = existingRules.some((r) => r.subjectId === selectedSubjectId);

      if (!hasRule) {
        // Kural eksik: satır içi kural tanımlama modalını tetikle
        setSubjectNeedingRule(subjectObj);
        setEnsureRuleOpen(true);
        setIsSubmitting(false);
        return;
      }

      // 2. Kural mevcut: dersi doğrudan sınava ekle
      await handleAddSubjectDirectly(subjectObj.id, subjectObj.name);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Ders kuralları denetlenirken bir hata oluştu.');
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
      setIsSubmitting(false);
    }
  };

  const handleRemoveSubject = async (subjectId: string, subjectName: string) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const updated = await examsApi.removeSubject(currentExam.id, subjectId);
      setActiveExam(updated);
      onExamUpdated?.(updated);

      await queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'exams'),
      });
      dispatch(
        pushToast({
          title: 'Ders Çıkarıldı',
          description: `"${subjectName}" dersi sınavdan çıkarıldı.`,
        })
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Ders sınavdan çıkarılamadı.');
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Sınav Ders Eşleştirmeleri"
        description={`"${currentExam.title}" (${currentExam.examType}) sınavına ait dersleri yönetin.`}
      >
        <div className="space-y-4">
          {serverError ? (
            <Alert variant="destructive" title="İşlem Başarısız">
              {serverError}
            </Alert>
          ) : null}

          {isFinalized ? (
            <Alert variant="default" title="Sınav Kesinleştirildi">
              Kesinleştirilmiş bir sınavın ders listesi değiştirilemez.
            </Alert>
          ) : null}

          {/* Add Subject Section */}
          {!isFinalized ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1">
                <Select
                  aria-label="Sınava Eklenecek Dersi Seçin"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  disabled={isSubmitting || isLoadingSubjects}
                >
                  <option value="">
                    {isLoadingSubjects
                      ? 'Dersler yükleniyor...'
                      : availableSubjects.length === 0
                        ? 'Tüm mevcut dersler zaten eklendi'
                        : 'Sınava eklenecek dersi seçin...'}
                  </option>
                  {availableSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                onClick={handleAddSubjectClick}
                disabled={!selectedSubjectId || isSubmitting}
                className="gap-1.5 shrink-0"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden="true" />
                )}
                Dersi Ekle
              </Button>
            </div>
          ) : null}

          {/* Linked Subjects List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sınavdaki Dersler ({currentExam.subjects?.length || 0})
            </h4>

            {!currentExam.subjects || currentExam.subjects.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                <BookOpen className="mx-auto mb-2 h-7 w-7 opacity-40" aria-hidden="true" />
                Bu sınava henüz ders eklenmemiş.
              </div>
            ) : (
              <div className="divide-y rounded-lg border bg-card">
                {currentExam.subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      <span className="font-medium text-foreground">{subject.name}</span>
                    </div>

                    {!isFinalized ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSubject(subject.id, subject.name)}
                        disabled={isSubmitting}
                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                        aria-label={`${subject.name} dersini sınavdan kaldır`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Kaldır
                      </Button>
                    ) : null}
                  </div>
                ))}
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

      {/* Satır içi net kuralı tanımlama modalı */}
      {subjectNeedingRule ? (
        <ExamRuleEnsureDialog
          open={ensureRuleOpen}
          onOpenChange={(isOpen) => {
            setEnsureRuleOpen(isOpen);
            if (!isOpen) {
              setSubjectNeedingRule(null);
            }
          }}
          examType={currentExam.examType}
          subjectId={subjectNeedingRule.id}
          subjectName={subjectNeedingRule.name}
          onRuleEnsured={async () => {
            await handleAddSubjectDirectly(subjectNeedingRule.id, subjectNeedingRule.name);
          }}
        />
      ) : null}
    </>
  );
}

