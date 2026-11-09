import * as React from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileEdit,
  Loader2,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppSelector } from '@/store';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { formatLocalDate } from '@/lib/utils';
import { ApiError } from '@/lib/api/error-parser';
import {
  useStudentExamsQuery,
  useStudentHistoryQuery,
  useStudentSubjectsQuery,
  type StudentExamStatusFilter,
} from '../api/studentPortalApi';
import { SubmitExamResultDialog } from '../components/SubmitExamResultDialog';
import type { ExamPerformanceDto, ExamResponse } from '@/types/api';

const FILTER_TABS: { key: StudentExamStatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Tüm Sınavlar' },
  { key: 'OPEN', label: 'Açık Sınavlar (Sonuç Girişi)' },
  { key: 'FINALIZED', label: 'Kesinleşenler (Karne & AI Rapor)' },
];

export function StudentExamsPage() {
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const userId = useAppSelector((state) => state.auth.user?.id);

  const [activeFilter, setActiveFilter] = React.useState<StudentExamStatusFilter>('ALL');
  const [submittingExam, setSubmittingExam] = React.useState<ExamResponse | null>(null);
  const tabRefs = React.useRef<Record<StudentExamStatusFilter, HTMLButtonElement | null>>({
    ALL: null,
    OPEN: null,
    FINALIZED: null,
  });

  const {
    data: exams,
    isLoading: isLoadingExams,
    isFetching: isFetchingExams,
    isError: isExamsError,
    error: examsError,
    refetch: refetchExams,
  } = useStudentExamsQuery(activeFilter);

  const { data: subjects = [] } = useStudentSubjectsQuery();
  const { data: historyReport } = useStudentHistoryQuery(userId);

  const historyByExamId = React.useMemo(() => {
    const map = new Map<string, ExamPerformanceDto>();
    if (historyReport?.examHistory) {
      for (const item of historyReport.examHistory) {
        map.set(item.examId, item);
      }
    }
    return map;
  }, [historyReport]);

  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = FILTER_TABS.findIndex((t) => t.key === activeFilter);
    let nextIndex = -1;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % FILTER_TABS.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + FILTER_TABS.length) % FILTER_TABS.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = FILTER_TABS.length - 1;
    }

    if (nextIndex !== -1) {
      const nextKey = FILTER_TABS[nextIndex].key;
      setActiveFilter(nextKey);
      tabRefs.current[nextKey]?.focus();
    }
  };

  const handleSubmissionSuccess = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'student-exams'),
      }),
      queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'student-history'),
      }),
      queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'student-home'),
      }),
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Sınavlarım ve Manuel Sonuç Girişi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sınıfınıza atanan açık sınavlara doğru/yanlış sayılarınızı girin; kesinleşen sınavların
            karnesini ve yapay zeka analizini görüntüleyin.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetchExams()}
          disabled={isFetchingExams}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${isFetchingExams ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Yenile
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
          <div
            role="tablist"
            aria-label="Öğrenci sınav durumu filtre sekmeleri"
            onKeyDown={handleTabKeyDown}
            className="flex flex-wrap items-center gap-2"
          >
            {FILTER_TABS.map((tab) => {
              const isSelected = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[tab.key] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`student-exam-tab-${tab.key.toLowerCase()}`}
                  tabIndex={isSelected ? 0 : -1}
                  aria-selected={isSelected}
                  aria-controls="student-exams-panel"
                  onClick={() => setActiveFilter(tab.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isFetchingExams ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
            ) : null}
            {exams ? <span>Toplam {exams.length} sınav listeleniyor</span> : null}
          </div>
        </div>

        {/* Exams Table Panel */}
        <div
          id="student-exams-panel"
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`student-exam-tab-${activeFilter.toLowerCase()}`}
          className="rounded-lg border bg-card shadow-sm overflow-hidden focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sınav Adı</TableHead>
                <TableHead>Sınav Türü</TableHead>
                <TableHead>Sınav Tarihi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Sonuç / Net Özeti</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingExams && !exams ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                      <span>Sınavlar yükleniyor...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isExamsError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-destructive">
                    <div role="alert" className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
                      <span className="text-sm font-medium">
                        {examsError instanceof ApiError
                          ? examsError.message
                          : 'Sınav listesi yüklenirken bir hata oluştu.'}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetchExams()}
                        className="mt-1 gap-1 text-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        Tekrar Dene
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !exams || exams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <BookOpen className="h-8 w-8 opacity-30" aria-hidden="true" />
                      <span>Bu filtreye uygun atanmış sınav bulunmamaktadır.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                exams.map((exam) => {
                  const isFinalized = exam.status === 'FINALIZED';
                  const existingPerf = historyByExamId.get(exam.id);

                  return (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium text-foreground">
                        {exam.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {exam.examType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{formatLocalDate(exam.examDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isFinalized ? (
                          <Badge variant="outline" className="gap-1">
                            <Lock className="h-3 w-3" aria-hidden="true" />
                            Kesinleşti
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            Açık (Sonuç Girişi)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {existingPerf ? (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-semibold text-primary">
                              {Number(existingPerf.totalScore).toFixed(2)} Net
                            </span>
                            {existingPerf.classRank != null ? (
                              <Badge variant="outline" className="text-[10px]">
                                Sınıf: {existingPerf.classRank}.
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                (Gönderildi)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Henüz sonuç girilmedi
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isFinalized ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setSubmittingExam(exam)}
                              className="h-8 text-xs gap-1.5"
                              aria-label={`${exam.title} sınavı için sonuç gir`}
                            >
                              <FileEdit className="h-3.5 w-3.5" aria-hidden="true" />
                              {existingPerf ? 'Sonucu Güncelle' : 'Sonuç Gir'}
                            </Button>
                          ) : null}

                          {isFinalized ? (
                            <Link to={`/student/exams/${exam.id}/dashboard`}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1.5"
                              >
                                <BarChart3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                Karne &amp; AI Raporu
                              </Button>
                            </Link>
                          ) : existingPerf ? (
                            <Badge variant="secondary" className="gap-1 text-[11px]">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                              Onay / Kesinleşme Bekliyor
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Manual Result Submission Dialog */}
      <SubmitExamResultDialog
        open={Boolean(submittingExam)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSubmittingExam(null);
        }}
        exam={submittingExam}
        availableSubjects={subjects}
        existingSubjectScores={
          submittingExam ? historyByExamId.get(submittingExam.id)?.subjectScores : undefined
        }
        onSuccess={handleSubmissionSuccess}
      />
    </div>
  );
}

