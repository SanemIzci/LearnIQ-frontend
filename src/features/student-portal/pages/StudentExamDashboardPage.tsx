import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Medal,
  Printer,
  RefreshCw,
  Share2,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppDispatch, useAppSelector } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { formatLocalDate } from '@/lib/utils';
import { ApiError } from '@/lib/api/error-parser';
import {
  studentPortalApi,
  useStudentExamDashboardQuery,
  useStudentHistoryQuery,
} from '../api/studentPortalApi';
import { AiReportCard } from '../components/AiReportCard';

export function StudentExamDashboardPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.auth.user?.id);

  const [shareToken, setShareToken] = React.useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = React.useState(false);
  const [shareError, setShareError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setShareToken(null);
    setShareError(null);
    setIsGeneratingShare(false);
    setCopied(false);
  }, [examId]);

  const {
    data: dashboard,
    isLoading: isLoadingDashboard,
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useStudentExamDashboardQuery(examId);

  const { data: historyReport } = useStudentHistoryQuery(userId);

  const examPerf = React.useMemo(() => {
    if (!examId || !historyReport?.examHistory) return null;
    return historyReport.examHistory.find((item) => item.examId === examId) ?? null;
  }, [examId, historyReport]);

  const handleGenerateShareLink = async () => {
    if (!examId) return;
    setIsGeneratingShare(true);
    setShareError(null);

    try {
      const res = await studentPortalApi.generateShareLink(examId);
      setShareToken(res.token);
      dispatch(
        pushToast({
          title: 'Paylaşım Linki Oluşturuldu',
          description: '30 gün geçerli sınav karne paylaşım bağlantınız hazır.',
        })
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setShareError(err.message || 'Paylaşım linki oluşturulurken bir hata oluştu.');
      } else {
        setShareError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const shareUrl = React.useMemo(() => {
    if (!shareToken) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/share/${shareToken}`;
  }, [shareToken]);

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    if (!navigator.clipboard?.writeText) {
      setCopied(false);
      setShareError(
        'Tarayıcınız otomatik kopyalamayı desteklemiyor. Lütfen bağlantıyı kutudan manuel olarak kopyalayın.'
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareError(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      dispatch(
        pushToast({
          title: 'Bağlantı Kopyalandı',
          description: 'Paylaşım bağlantısı panoya kopyalandı.',
        })
      );
    } catch {
      setCopied(false);
      setShareError('Bağlantı panoya kopyalanamadı. Lütfen manuel olarak kopyalayın.');
    }
  };

  if (isLoadingDashboard) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <span>Sınav karnesi ve sıralama istatistikleri yükleniyor...</span>
      </div>
    );
  }

  if (isDashboardError || !dashboard) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/student/exams')}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Sınavlarıma Dön
          </Button>
        </div>

        <div role="alert">
          <Alert variant="destructive" title="Sınav Karnesi Görüntülenemiyor">
            {dashboardError instanceof ApiError
              ? dashboardError.message
              : 'Bu sınav henüz kesinleştirilmemiş veya onaylanmış bir sonucunuz bulunmamaktadır.'}
          </Alert>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetchDashboard()}
          className="gap-1.5"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  const netScoreVal = Number(dashboard.netScore) || 0;
  const classAvgVal = dashboard.classAverage != null ? Number(dashboard.classAverage) : null;
  const diffFromClassAvg = classAvgVal != null ? netScoreVal - classAvgVal : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/student/exams" className="hover:text-foreground transition-colors">
              Sınavlarım
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-xs">
              {examPerf?.examTitle || 'Sınav Karnesi'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/student/exams')}
              className="h-8 w-8 p-0 shrink-0"
              aria-label="Sınav listesine geri dön"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {examPerf?.examTitle || 'Öğrenci Sınav Sonuç Karnesi'}
            </h1>
            {examPerf?.examType ? (
              <Badge variant="secondary" className="font-mono text-xs">
                {examPerf.examType}
              </Badge>
            ) : null}
            <Badge variant="success">Kesinleşmiş Sonuç</Badge>
          </div>

          {examPerf?.examDate ? (
            <p className="text-xs text-muted-foreground pl-10">
              Sınav Tarihi: <strong className="text-foreground">{formatLocalDate(examPerf.examDate)}</strong>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-10 lg:pl-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateShareLink}
            disabled={isGeneratingShare}
            className="gap-1.5 text-xs"
          >
            {isGeneratingShare ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Share2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            )}
            Paylaşım Linki Oluştur
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Karnemi Yazdır / PDF
          </Button>
        </div>
      </div>

      {/* Share Link Error or Generated Box */}
      {shareError ? (
        <div role="alert" aria-live="polite" className="print:hidden">
          <Alert variant="destructive" title="Paylaşım Hatası">
            {shareError}
          </Alert>
        </div>
      ) : null}

      {shareToken ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2 print:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Share2 className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Herkese Açık Karne Paylaşım Bağlantınız (30 Gün Geçerli)</span>
            </div>
            <Link
              to={`/share/${shareToken}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <span>Önizle</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              readOnly
              aria-label="Paylaşım bağlantısı"
              value={shareUrl}
              className="flex-1 rounded-md border bg-card px-3 py-1.5 font-mono text-xs text-foreground focus:outline-none"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleCopyShareUrl}
              className="gap-1.5 text-xs shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  Kopyalandı
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Bağlantıyı Kopyala
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Scorecard Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Toplam Net</span>
            <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">
            {netScoreVal.toFixed(2)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Onaylanmış toplam net puanı</p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sınıf Derecesi</span>
            <Medal className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">
            {dashboard.classRank != null ? `${dashboard.classRank}.` : '—'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Sınıf içi başarı sırası</p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Okul Derecesi</span>
            <Award className="h-4 w-4 text-indigo-500" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">
            {dashboard.schoolRank != null ? `${dashboard.schoolRank}.` : '—'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Kurum geneli başarı sırası</p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Yüzdelik Dilim</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {dashboard.percentile != null ? `%${Number(dashboard.percentile).toFixed(2)}` : '—'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Sınıf içi yüzdelik dilim</p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sınıf Ortalaması</span>
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">
            {classAvgVal != null ? classAvgVal.toFixed(2) : '—'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {diffFromClassAvg != null ? (
              diffFromClassAvg >= 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  +{diffFromClassAvg.toFixed(2)} ortalamanın üzerinde
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {diffFromClassAvg.toFixed(2)} ortalamanın altında
                </span>
              )
            ) : (
              'Sınıf genel net ortalaması'
            )}
          </p>
        </div>
      </div>

      {/* Middle Section: Top 3 Students & Subject Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Top 3 Leaderboard */}
        <Card className="lg:col-span-5 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
              <CardTitle as="h2" className="text-base">
                Sınıfta İlk 3 Başarı Sıralaması
              </CardTitle>
            </div>
            <CardDescription>
              Liderlik tablosu paylaşım iznine (KVKK) göre sınıfınızdaki en yüksek 3 sonuç.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {dashboard.top3Students && dashboard.top3Students.length > 0 ? (
              <ul className="space-y-2.5">
                {dashboard.top3Students.map((student, idx) => {
                  const name =
                    student.displayName || student.maskedName || 'Anonim Öğrenci';
                  return (
                    <li
                      key={`${student.rank}-${idx}`}
                      className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                          {student.rank}.
                        </span>
                        <span className="text-sm font-medium text-foreground">{name}</span>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {Number(student.netScore).toFixed(2)} Net
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Sıralama verisi bulunmuyor.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Subject Breakdown Table */}
        <Card className="lg:col-span-7 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle as="h2" className="text-base">
                Ders Bazlı Doğru / Yanlış ve Net Dökümü
              </CardTitle>
            </div>
            <CardDescription>
              Bu sınavda girdiğiniz ve öğretmeniniz tarafından onaylanan ders sonuçlarınız.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {examPerf?.subjectScores && examPerf.subjectScores.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ders</TableHead>
                      <TableHead className="text-right">Doğru</TableHead>
                      <TableHead className="text-right">Yanlış</TableHead>
                      <TableHead className="text-right">Net Puan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examPerf.subjectScores.map((sr) => (
                      <TableRow key={sr.subjectId}>
                        <TableCell className="font-medium text-foreground">
                          {sr.subjectName}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                          {sr.correctCount}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-rose-600 dark:text-rose-400">
                          {sr.wrongCount}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                          {Number(sr.netScore).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-8 text-center text-muted-foreground">
                <BookOpen className="h-7 w-7 opacity-30" aria-hidden="true" />
                <p className="text-xs">
                  Toplam Net: <strong className="text-foreground">{netScoreVal.toFixed(2)}</strong>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Report Component */}
      {examId ? <AiReportCard examId={examId} /> : null}
    </div>
  );
}

