import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  FileEdit,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppDispatch, useAppSelector } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { cn, formatLocalDate } from '@/lib/utils';
import { ApiError } from '@/lib/api/error-parser';
import {
  analyticsApi,
  useAnalyticsClassroomsQuery,
  useAnalyticsExamsQuery,
  useAnalyticsSubjectsQuery,
  useClassroomAnalyticsQuery,
  useClassroomObservationsQuery,
} from '../api/analyticsApi';
import { ObservationDialog } from '../components/ObservationDialog';
import type { ObservationFormValues } from '../schemas/observationSchemas';
import type { ObservationResponse } from '@/types/api';

export function ClassroomAnalyticsPage() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  const [selectedExamId, setSelectedExamId] = React.useState<string>('');
  const [observationDialogOpen, setObservationDialogOpen] = React.useState(false);
  const [editingObservation, setEditingObservation] = React.useState<ObservationResponse | null>(null);

  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    isError: isAnalyticsError,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useClassroomAnalyticsQuery(classroomId, selectedExamId || undefined);

  const {
    data: observations = [],
    isLoading: isLoadingObservations,
    refetch: refetchObservations,
  } = useClassroomObservationsQuery(classroomId);

  const { data: classrooms = [] } = useAnalyticsClassroomsQuery();
  const { data: exams = [] } = useAnalyticsExamsQuery();
  const { data: subjects = [] } = useAnalyticsSubjectsQuery();

  const currentClassroom = classrooms.find((c) => c.id === classroomId);
  const classroomTitle = analytics?.classroomName || currentClassroom?.name || 'Sınıf Analitiği';

  const deleteObservationMutation = useMutation({
    mutationFn: (id: string) => analyticsApi.deleteObservation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'classroom-observations', classroomId),
      });
      dispatch(
        pushToast({
          title: 'Gözlem Notu Silindi',
          description: 'Öğretmen gözlem notu başarıyla kaldırıldı.',
        })
      );
    },
    onError: (err) => {
      dispatch(
        pushToast({
          title: 'Silme Başarısız',
          description: err instanceof ApiError ? err.message : 'Not silinirken hata oluştu.',
          variant: 'destructive',
        })
      );
    },
  });

  const handleSaveObservation = async (payload: ObservationFormValues) => {
    if (!classroomId) return;
    if (editingObservation) {
      await analyticsApi.updateObservation(editingObservation.id, {
        content: payload.content,
        tags: payload.tags,
      });
      dispatch(
        pushToast({
          title: 'Gözlem Notu Güncellendi',
          description: 'Gözlem notunuz başarıyla güncellendi.',
        })
      );
    } else {
      await analyticsApi.createObservation(classroomId, {
        content: payload.content,
        subjectId: payload.subjectId || undefined,
        examId: payload.examId || undefined,
        tags: payload.tags,
      });
      dispatch(
        pushToast({
          title: 'Gözlem Notu Eklendi',
          description: 'Yeni öğretmen gözlemi kaydedildi.',
        })
      );
    }

    void queryClient.invalidateQueries({
      queryKey: tenantQueryKey(tenantId, 'classroom-observations', classroomId),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/staff/classrooms" className="hover:text-foreground transition-colors">
              Sınıflar
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{classroomTitle}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/staff/classrooms"
              aria-label="Sınıf listesine dön"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 w-8 p-0 shrink-0')}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {classroomTitle} — Başarı ve Katılım Analitiği
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void refetchAnalytics();
              void refetchObservations();
            }}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Yenile
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingObservation(null);
              setObservationDialogOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Gözlem Notu Ekle
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 bg-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold">Analiz Filtresi:</span>
          </div>

          <div className="w-full sm:w-72 space-y-1">
            <Label htmlFor="classroom-analytics-exam-select" className="text-xs text-muted-foreground">
              İncelenecek Sınav
            </Label>
            <Select
              id="classroom-analytics-exam-select"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
            >
              <option value="">En Son Sınav (Otomatik Analiz)</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} ({exam.examType})
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Analytics KPI Metrics */}
      {isLoadingAnalytics ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          <span>Sınıf analitiği hesaplanıyor...</span>
        </div>
      ) : isAnalyticsError || !analytics ? (
        <div role="alert" className="space-y-3">
          <Alert variant="destructive" title="Analitik Verileri Yüklenemedi">
            {analyticsError instanceof ApiError
              ? analyticsError.message
              : 'Bu sınıf için henüz sınav sonucu veya analitik verisi bulunmuyor.'}
          </Alert>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetchAnalytics()}>
            Tekrar Dene
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Sınıf Net Ortalaması</CardDescription>
                <CardTitle className="text-2xl font-mono text-primary">
                  {(Number(analytics.classAverageScore) || 0).toFixed(2)} Net
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">İncelenen sınavdaki sınıf genel ortalaması</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Katılım Oranı</CardDescription>
                <CardTitle className="text-2xl font-mono text-emerald-600 dark:text-emerald-400">
                  %{(Number(analytics.participationRate) || 0).toFixed(0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {analytics.participationCount} / {analytics.totalStudents} öğrenci sınava girdi
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Toplam Öğrenci</CardDescription>
                <CardTitle className="text-2xl font-mono">
                  {analytics.totalStudents}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Sınıfa kayıtlı aktif öğrenci mevcudu</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">İncelenen Sınav</CardDescription>
                <CardTitle className="text-base font-semibold truncate">
                  {analytics.analyzedExam?.title || 'Sınav Belirtilmemiş'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {analytics.analyzedExam?.examDate
                    ? formatLocalDate(analytics.analyzedExam.examDate)
                    : 'Tarih yok'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Subject-by-Subject Breakdown Table */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                <CardTitle as="h2" className="text-base">
                  Ders Bazlı Doğru, Yanlış ve Net Ortalamaları
                </CardTitle>
              </div>
              <CardDescription>
                Sınıfın ilgili sınavdaki ders performans dökümü.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.subjectAverages.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Ders bazlı sonuç verisi bulunamadı.
                </div>
              ) : (
                <Table>
                  <caption className="sr-only">Ders bazlı başarı ve net ortalamaları</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Ders Adı</TableHead>
                      <TableHead scope="col" className="text-right">Ortalama Doğru</TableHead>
                      <TableHead scope="col" className="text-right">Ortalama Yanlış</TableHead>
                      <TableHead scope="col" className="text-right">Ortalama Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.subjectAverages.map((sub) => {
                      const net = Number(sub.avgNet ?? sub.averageNet) || 0;
                      const correct = Number(sub.avgCorrect ?? sub.averageCorrect) || 0;
                      const wrong = Number(sub.avgWrong ?? sub.averageWrong) || 0;

                      return (
                        <TableRow key={sub.subjectId}>
                          <TableCell className="font-semibold">{sub.subjectName}</TableCell>
                          <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {correct.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-rose-600 dark:text-rose-400">
                            {wrong.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary">
                            {net.toFixed(2)} Net
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Exam Trends */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
                <CardTitle as="h2" className="text-base">
                  Sınıfın Sınav Performans Trendi
                </CardTitle>
              </div>
              <CardDescription>
                Geçmiş sınavlardaki sınıf ortalaması ve katılım sayıları.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.recentExamTrends.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Henüz sınav gelişim verisi bulunmuyor.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {analytics.recentExamTrends.map((trend) => (
                    <div
                      key={trend.examId}
                      className="rounded-lg border bg-card p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {trend.examTitle}
                        </span>
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {(Number(trend.avgScore ?? trend.averageScore) || 0).toFixed(2)} Net
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          {formatLocalDate(trend.examDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" aria-hidden="true" />
                          {trend.studentCount ?? trend.participantCount} öğrenci
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Classroom Observations List */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle as="h2" className="text-base">
                Öğretmen Gözlem Notları ({observations.length})
              </CardTitle>
            </div>
            <CardDescription>
              Bu sınıf için kaydedilen pedagojik ve akademik öğretmen notları.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingObservation(null);
              setObservationDialogOpen(true);
            }}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Not Ekle
          </Button>
        </CardHeader>

        <CardContent className="pt-5">
          {isLoadingObservations ? (
            <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              <span>Gözlem notları yükleniyor...</span>
            </div>
          ) : observations.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Henüz bu sınıf için kaydedilmiş bir gözlem notu bulunmuyor.
            </div>
          ) : (
            <ul className="space-y-3">
              {observations.map((obs) => (
                <li
                  key={obs.id}
                  className="rounded-lg border bg-card p-4 space-y-2 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{obs.content}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
                        <span>Eklenme: {new Date(obs.createdAt).toLocaleDateString('tr-TR')}</span>
                        {obs.subjectId ? (
                          <Badge variant="outline" className="text-[10px]">
                            {subjects.find((s) => s.id === obs.subjectId)?.name || 'Ders Notu'}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingObservation(obs);
                          setObservationDialogOpen(true);
                        }}
                        className="h-8 w-8 p-0"
                        aria-label="Gözlem notunu düzenle"
                      >
                        <FileEdit className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteObservationMutation.mutate(obs.id)}
                        disabled={deleteObservationMutation.isPending}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        aria-label="Gözlem notunu sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  {Array.isArray(obs.tags) && obs.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {obs.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 text-[11px] py-0 px-2 bg-muted/60">
                          <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Observation Modal */}
      <ObservationDialog
        open={observationDialogOpen}
        onOpenChange={setObservationDialogOpen}
        classroomId={classroomId ?? ''}
        classroomName={classroomTitle}
        subjects={subjects}
        editingObservation={editingObservation}
        onSave={handleSaveObservation}
      />
    </div>
  );
}
