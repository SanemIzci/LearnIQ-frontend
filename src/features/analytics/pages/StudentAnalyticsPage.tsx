import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { cn, formatLocalDate } from '@/lib/utils';
import { ApiError } from '@/lib/api/error-parser';
import {
  analyticsApi,
  useStudentAnalyticsHistoryQuery,
} from '../api/analyticsApi';
import { StudentWeaknessCard } from '../components/StudentWeaknessCard';

export function StudentAnalyticsPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const dispatch = useAppDispatch();

  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false);

  const {
    data: historyReport,
    isLoading,
    isError,
    error,
    refetch,
  } = useStudentAnalyticsHistoryQuery(studentId);

  const handleGenerateAiReport = async () => {
    if (!studentId) return;
    setIsGeneratingAi(true);
    try {
      await analyticsApi.generateStudentAiReport(studentId);
      dispatch(
        pushToast({
          title: 'AI Raporu Talebi Alındı',
          description: 'Öğrenci için yapay zeka analiz raporu kuyruğa eklendi.',
        })
      );
    } catch (err) {
      dispatch(
        pushToast({
          title: 'Talep Başarısız',
          description: err instanceof ApiError ? err.message : 'AI raporu üretilemedi.',
          variant: 'destructive',
        })
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const exams = historyReport?.examHistory ?? [];
  const totalExams = historyReport?.totalExamsTaken ?? exams.length;
  const latestExam = exams[0] ?? null;
  const overallAvgNet = exams.length > 0
    ? exams.reduce((acc, e) => acc + e.totalScore, 0) / exams.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/staff/overview" className="hover:text-foreground transition-colors">
              Analitik
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Öğrenci Gelişim Analizi</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/staff/overview"
              aria-label="Analitik panosuna dön"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 w-8 p-0 shrink-0')}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Öğrenci Akademik Performans &amp; Zayıflık Analizi
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Yenile
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleGenerateAiReport}
            disabled={isGeneratingAi || exams.length === 0}
            className="gap-1.5"
          >
            {isGeneratingAi ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Öğrenci AI Raporu Üret
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          <span>Öğrenci sınav geçmişi ve analitik verileri yükleniyor...</span>
        </div>
      ) : isError ? (
        <div role="alert" className="space-y-3">
          <Alert variant="destructive" title="Öğrenci Verileri Alınamadı">
            {error instanceof ApiError
              ? error.message
              : 'Öğrencinin geçmiş sınav verileri yüklenirken bir hata oluştu.'}
          </Alert>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Tekrar Dene
          </Button>
        </div>
      ) : (
        <>
          {/* Top Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Toplam Onaylı Sınav</CardDescription>
                <CardTitle className="text-2xl font-mono text-primary">{totalExams}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Katılınan ve onaylanan sınav sayısı</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Genel Net Ortalaması</CardDescription>
                <CardTitle className="text-2xl font-mono text-emerald-600 dark:text-emerald-400">
                  {overallAvgNet.toFixed(2)} Net
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Tüm sınavların genel ortalaması</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Son Sınav Neti</CardDescription>
                <CardTitle className="text-2xl font-mono">
                  {latestExam ? `${Number(latestExam.totalScore).toFixed(2)} Net` : '—'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground truncate">
                  {latestExam ? latestExam.examTitle : 'Sınav yok'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Subject Weakness & Strengths Diagnosis Card */}
          <StudentWeaknessCard
            historyReport={historyReport}
            onGenerateAiReport={handleGenerateAiReport}
            isGeneratingReport={isGeneratingAi}
          />

          {/* Historical Exams Table */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" aria-hidden="true" />
                <CardTitle as="h2" className="text-base">
                  Sınav Geçmişi ve Ders Net Dökümleri
                </CardTitle>
              </div>
              <CardDescription>
                Öğrencinin katıldığı sınavların toplam netleri ve sınıf/okul dereceleri.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {exams.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Öğrenciye ait sınav geçmişi bulunmuyor.
                </div>
              ) : (
                <Table>
                  <caption className="sr-only">Öğrencinin katıldığı sınavların başarı geçmişi</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Sınav Adı</TableHead>
                      <TableHead scope="col">Tarih</TableHead>
                      <TableHead scope="col">Tür</TableHead>
                      <TableHead scope="col" className="text-right">Sınıf Derecesi</TableHead>
                      <TableHead scope="col" className="text-right">Okul Derecesi</TableHead>
                      <TableHead scope="col" className="text-right">Toplam Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map((item) => (
                      <TableRow key={item.examId}>
                        <TableCell className="font-semibold">{item.examTitle}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatLocalDate(item.examDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {item.examType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {item.classRank != null ? `#${item.classRank}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {item.schoolRank != null ? `#${item.schoolRank}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                          {item.totalScore.toFixed(2)} Net
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
