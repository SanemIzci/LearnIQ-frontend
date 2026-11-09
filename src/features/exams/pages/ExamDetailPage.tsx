import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Lock,
  RefreshCw,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import { useAppDispatch, useAppSelector } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { formatLocalDate } from '@/lib/utils';
import { ApiError } from '@/lib/api/error-parser';
import {
  examsApi,
  useExamDetailQuery,
  useExamResultsQuery,
} from '../api/examsApi';
import { FinalizeExamDialog } from '../components/FinalizeExamDialog';
import { RejectResultDialog } from '../components/RejectResultDialog';
import { ExamSubjectsDialog } from '../components/ExamSubjectsDialog';
import { ExamClassroomsDialog } from '../components/ExamClassroomsDialog';
import type { EntryMethod, ResultStatus, StudentExamResult } from '@/types/api';

function getEntryMethodBadge(method: EntryMethod) {
  switch (method) {
    case 'OCR':
      return <Badge variant="secondary" className="text-[11px]">Optik Tarama</Badge>;
    case 'TEACHER_BULK':
      return <Badge variant="secondary" className="text-[11px]">Toplu Giriş</Badge>;
    case 'MANUAL':
    default:
      return <Badge variant="outline" className="text-[11px]">Manuel Giriş</Badge>;
  }
}

export function ExamDetailPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  const [activeTab, setActiveTab] = React.useState<ResultStatus>('SUBMITTED');
  const [page, setPage] = React.useState(0);
  const pageSize = 15;

  // Active dialogs
  const [finalizeDialogOpen, setFinalizeDialogOpen] = React.useState(false);
  const [rejectingResult, setRejectingResult] = React.useState<StudentExamResult | null>(null);
  const [subjectsDialogOpen, setSubjectsDialogOpen] = React.useState(false);
  const [classroomsDialogOpen, setClassroomsDialogOpen] = React.useState(false);
  const [actionLoadingIds, setActionLoadingIds] = React.useState<Set<string>>(new Set());
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Queries
  const {
    data: exam,
    isLoading: isLoadingExam,
    isError: isExamError,
    error: examError,
  } = useExamDetailQuery(examId);

  const {
    data: resultsPage,
    isLoading: isLoadingResults,
    isFetching: isFetchingResults,
    isError: isResultsError,
    error: resultsError,
    refetch: refetchResults,
  } = useExamResultsQuery(examId, {
    status: activeTab,
    page,
    size: pageSize,
  });

  // Query counts for metrics
  const { data: submittedStats } = useExamResultsQuery(examId, {
    status: 'SUBMITTED',
    page: 0,
    size: 1,
  });

  const { data: approvedStats } = useExamResultsQuery(examId, {
    status: 'APPROVED',
    page: 0,
    size: 1,
  });

  const { data: rejectedStats } = useExamResultsQuery(examId, {
    status: 'REJECTED',
    page: 0,
    size: 1,
  });

  const isFinalized = exam?.status === 'FINALIZED';
  const totalPages = resultsPage ? Math.max(1, Math.ceil(resultsPage.totalElements / pageSize)) : 1;

  // D2: Clamp page when totalPages shrinks (e.g. after approving/rejecting items)
  React.useEffect(() => {
    if (page > 0 && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const TAB_KEYS: ResultStatus[] = ['SUBMITTED', 'APPROVED', 'REJECTED'];
  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = TAB_KEYS.indexOf(activeTab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextTab = TAB_KEYS[(currentIndex + 1) % TAB_KEYS.length];
      setActiveTab(nextTab);
      setPage(0);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevTab = TAB_KEYS[(currentIndex - 1 + TAB_KEYS.length) % TAB_KEYS.length];
      setActiveTab(prevTab);
      setPage(0);
    }
  };

  const handleApprove = async (result: StudentExamResult) => {
    if (!examId) return;
    setActionLoadingIds((prev) => new Set(prev).add(result.id));
    setActionError(null);

    try {
      await examsApi.approveResult(examId, result.id);
      await queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'exam-results', examId),
      });
      dispatch(
        pushToast({
          title: 'Sonuç Onaylandı',
          description: `#${result.studentId.slice(0, 8)}... ID'li öğrencinin sınav sonucu onaylandı.`,
        })
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message || 'Sonuç onaylanırken bir hata oluştu.');
      } else {
        setActionError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(result.id);
        return next;
      });
    }
  };

  const handleRefresh = async () => {
    if (!examId) return;
    await queryClient.invalidateQueries({
      queryKey: tenantQueryKey(tenantId, 'exams'),
    });
    await queryClient.invalidateQueries({
      queryKey: tenantQueryKey(tenantId, 'exam-results', examId),
    });
  };

  if (isLoadingExam) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <span>Sınav detayları yükleniyor...</span>
      </div>
    );
  }

  if (isExamError || !exam) {
    const errorMsg =
      examError instanceof ApiError
        ? examError.message
        : 'Sınav bilgileri yüklenemedi veya böyle bir sınav bulunamadı.';
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/staff/exams')} className="gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Sınav Listesine Dön
        </Button>
        <Alert variant="destructive" title="Sınav Bulunamadı">
          {errorMsg}
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/staff/exams" className="hover:text-foreground transition-colors">
          Sınavlar
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground truncate max-w-xs">{exam.title}</span>
      </div>

      {/* Top Header Card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/staff/exams')}
                className="h-8 w-8 p-0 shrink-0"
                aria-label="Sınav Listesine Dön"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{exam.title}</h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {exam.examType}
              </Badge>
              {isFinalized ? (
                <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground gap-1">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  Kesinleştirildi
                </Badge>
              ) : (
                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 gap-1">
                  Açık
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pl-10">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sınav Tarihi: <strong className="text-foreground">{formatLocalDate(exam.examDate)}</strong></span>
              </div>
              {isFinalized && exam.finalizedAt ? (
                <div className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <span>Kesinleştirilme: <strong className="text-foreground">{formatLocalDate(exam.finalizedAt.split('T')[0])}</strong></span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pl-10 lg:pl-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubjectsDialogOpen(true)}
              className="gap-1.5 h-8 text-xs font-normal"
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>{exam.subjects?.length || 0} Ders</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setClassroomsDialogOpen(true)}
              className="gap-1.5 h-8 text-xs font-normal"
            >
              <GraduationCap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>{exam.classroomIds?.length || 0} Sınıf</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-8 w-8 p-0"
              aria-label="Yenile"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>

            {!isFinalized ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => setFinalizeDialogOpen(true)}
                className="gap-1.5 h-8 text-xs font-medium"
              >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Sınavı Kesinleştir
              </Button>
            ) : null}
          </div>
        </div>

        {isFinalized ? (
          <div className="rounded-lg border border-muted bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              Bu sınav kesinleştirilmiştir. Tüm okul/sınıf dereceleri ve yüzdelik dilimler hesaplanmış olup, sınav içeriği veya öğrenci sonuçları üzerinde değişiklik yapılamaz.
            </span>
          </div>
        ) : null}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>İnceleme Bekleyen</span>
            <Clock className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {submittedStats?.totalElements ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Onay veya ret bekleyen sonuçlar</p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Onaylanan Sonuçlar</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {approvedStats?.totalElements ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Sıralamaya dahil edilen sonuçlar</p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Reddedilen Sonuçlar</span>
            <XCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {rejectedStats?.totalElements ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Düzeltme için iade edilen sonuçlar</p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Ders ve Sınıf Sayısı</span>
            <Award className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {exam.subjects?.length || 0} <span className="text-sm font-normal text-muted-foreground">Ders</span> / {exam.classroomIds?.length || 0} <span className="text-sm font-normal text-muted-foreground">Sınıf</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Sınava tanımlı kapsam</p>
        </div>
      </div>

      {/* Action Error Alert */}
      {actionError ? (
        <div role="alert" aria-live="polite">
          <Alert variant="destructive" title="İşlem Başarısız">
            {actionError}
          </Alert>
        </div>
      ) : null}

      {/* Tabs and Results Review Center */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
          <div
            role="tablist"
            aria-label="Sınav sonuç durumu sekmeleri"
            onKeyDown={handleTabKeyDown}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              role="tab"
              id="tab-submitted"
              tabIndex={activeTab === 'SUBMITTED' ? 0 : -1}
              aria-selected={activeTab === 'SUBMITTED'}
              aria-controls="results-table-panel"
              onClick={() => {
                setActiveTab('SUBMITTED');
                setPage(0);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'SUBMITTED'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>İnceleme Bekleyenler</span>
              {submittedStats && submittedStats.totalElements > 0 ? (
                <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                  {submittedStats.totalElements}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              role="tab"
              id="tab-approved"
              tabIndex={activeTab === 'APPROVED' ? 0 : -1}
              aria-selected={activeTab === 'APPROVED'}
              aria-controls="results-table-panel"
              onClick={() => {
                setActiveTab('APPROVED');
                setPage(0);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'APPROVED'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Onaylananlar</span>
              {approvedStats && approvedStats.totalElements > 0 ? (
                <span className="rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 text-[10px] font-bold">
                  {approvedStats.totalElements}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              role="tab"
              id="tab-rejected"
              tabIndex={activeTab === 'REJECTED' ? 0 : -1}
              aria-selected={activeTab === 'REJECTED'}
              aria-controls="results-table-panel"
              onClick={() => {
                setActiveTab('REJECTED');
                setPage(0);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'REJECTED'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reddedilenler</span>
              {rejectedStats && rejectedStats.totalElements > 0 ? (
                <span className="rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 text-[10px] font-bold">
                  {rejectedStats.totalElements}
                </span>
              ) : null}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isFetchingResults ? (
              <Loader2 className="h-3 w-3 animate-spin text-primary" aria-hidden="true" />
            ) : null}
            {resultsPage ? (
              <span>Toplam {resultsPage.totalElements} kayıt (Sayfa {page + 1} / {totalPages})</span>
            ) : null}
          </div>
        </div>

        {/* Results Table */}
        <div
          id="results-table-panel"
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`tab-${activeTab.toLowerCase()}`}
          className="rounded-lg border bg-card shadow-sm overflow-hidden focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Öğrenci</TableHead>
                <TableHead>Toplam Puan</TableHead>
                <TableHead>Giriş Yöntemi</TableHead>
                {activeTab === 'SUBMITTED' ? (
                  <>
                    <TableHead>Gönderilme Tarihi</TableHead>
                    <TableHead className="text-right">İnceleme Aksiyonları</TableHead>
                  </>
                ) : null}
                {activeTab === 'APPROVED' ? (
                  <>
                    <TableHead>Okul Derecesi</TableHead>
                    <TableHead>Sınıf Derecesi</TableHead>
                    <TableHead>Yüzdelik Dilim</TableHead>
                    <TableHead>İnceleme Tarihi</TableHead>
                  </>
                ) : null}
                {activeTab === 'REJECTED' ? (
                  <>
                    <TableHead>Reddetme Gerekçesi</TableHead>
                    <TableHead>İnceleme Tarihi</TableHead>
                  </>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingResults && !resultsPage ? (
                <TableRow>
                  <TableCell
                    colSpan={activeTab === 'SUBMITTED' ? 5 : activeTab === 'APPROVED' ? 7 : 5}
                    className="h-32 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                      <span>Sonuçlar yükleniyor...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isResultsError ? (
                <TableRow>
                  <TableCell
                    colSpan={activeTab === 'SUBMITTED' ? 5 : activeTab === 'APPROVED' ? 7 : 5}
                    className="h-32 text-center text-destructive"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
                      <span className="text-sm font-medium">
                        {resultsError instanceof ApiError
                          ? resultsError.message
                          : 'Sonuçlar yüklenirken bir hata oluştu.'}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetchResults()}
                        className="mt-1 gap-1 text-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        Tekrar Dene
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !resultsPage?.content || resultsPage.content.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={activeTab === 'SUBMITTED' ? 5 : activeTab === 'APPROVED' ? 7 : 5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Users className="h-8 w-8 opacity-30" aria-hidden="true" />
                      <span>
                        {activeTab === 'SUBMITTED'
                          ? 'İnceleme bekleyen öğrenci sonucu bulunmamaktadır.'
                          : activeTab === 'APPROVED'
                          ? 'Henüz onaylanmış öğrenci sonucu bulunmamaktadır.'
                          : 'Reddedilmiş öğrenci sonucu bulunmamaktadır.'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                resultsPage.content.map((result) => {
                  const isActionLoading = actionLoadingIds.has(result.id);
                  const formattedStudent = `#${result.studentId.slice(0, 8)}...`;

                  return (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{formattedStudent}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {Number(result.totalScore).toFixed(2)}
                      </TableCell>
                      <TableCell>{getEntryMethodBadge(result.entryMethod)}</TableCell>

                      {activeTab === 'SUBMITTED' ? (
                        <>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatLocalDate(result.createdAt?.split('T')[0])}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(result)}
                                disabled={isActionLoading || isFinalized}
                                className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                aria-label={`${formattedStudent} sonucunu onayla`}
                              >
                                {isActionLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                                Onayla
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRejectingResult(result)}
                                disabled={isActionLoading || isFinalized}
                                className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                aria-label={`${formattedStudent} sonucunu reddet`}
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                                Reddet
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : null}

                      {activeTab === 'APPROVED' ? (
                        <>
                          <TableCell className="font-mono text-xs font-medium">
                            {result.schoolRank ? `${result.schoolRank}.` : '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium">
                            {result.classRank ? `${result.classRank}.` : '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium">
                            {result.percentile != null ? `%${Number(result.percentile).toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {result.reviewedAt ? formatLocalDate(result.reviewedAt.split('T')[0]) : '—'}
                          </TableCell>
                        </>
                      ) : null}

                      {activeTab === 'REJECTED' ? (
                        <>
                          <TableCell className="text-xs text-destructive font-medium max-w-xs truncate" title={result.rejectionReason || ''}>
                            {result.rejectionReason || 'Gerekçe belirtilmemiş'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {result.reviewedAt ? formatLocalDate(result.reviewedAt.split('T')[0]) : '—'}
                          </TableCell>
                        </>
                      ) : null}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {resultsPage && totalPages > 1 ? (
          <div className="flex items-center justify-between px-2 pt-2">
            <span className="text-xs text-muted-foreground">
              Sayfa {page + 1} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isLoadingResults}
                className="h-8 text-xs"
              >
                Önceki
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || isLoadingResults}
                className="h-8 text-xs"
              >
                Sonraki
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Finalize Exam Modal */}
      <FinalizeExamDialog
        open={finalizeDialogOpen}
        onOpenChange={setFinalizeDialogOpen}
        exam={exam}
        pendingResultsCount={submittedStats?.totalElements ?? 0}
        onSuccess={handleRefresh}
      />

      {/* Reject Result Modal */}
      {rejectingResult && examId ? (
        <RejectResultDialog
          open={Boolean(rejectingResult)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setRejectingResult(null);
          }}
          examId={examId}
          result={rejectingResult}
          onSuccess={handleRefresh}
        />
      ) : null}

      {/* Exam Subjects Modal */}
      <ExamSubjectsDialog
        exam={exam}
        open={subjectsDialogOpen}
        onOpenChange={setSubjectsDialogOpen}
        onExamUpdated={handleRefresh}
      />

      {/* Exam Classrooms Modal */}
      <ExamClassroomsDialog
        exam={exam}
        open={classroomsDialogOpen}
        onOpenChange={setClassroomsDialogOpen}
        onExamUpdated={handleRefresh}
      />
    </div>
  );
}
