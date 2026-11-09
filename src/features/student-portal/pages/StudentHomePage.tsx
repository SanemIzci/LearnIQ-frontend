import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  GraduationCap,
  Loader2,
  RefreshCw,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { formatLocalDate } from '@/lib/utils';
import { ApiError } from '@/lib/api/error-parser';
import {
  useStudentHomeQuery,
  useStudentSubjectsQuery,
  useStudentTrendsQuery,
} from '../api/studentPortalApi';

export function StudentHomePage() {
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>('');

  const {
    data: homeData,
    isLoading: isLoadingHome,
    isError: isHomeError,
    error: homeError,
    refetch: refetchHome,
  } = useStudentHomeQuery();

  const { data: subjects = [] } = useStudentSubjectsQuery();

  const {
    data: trends = [],
    isLoading: isLoadingTrends,
    isError: isTrendsError,
    error: trendsError,
    refetch: refetchTrends,
  } = useStudentTrendsQuery(selectedSubjectId || undefined);

  if (isLoadingHome && !homeData) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <span>Öğrenci ana sayfası yükleniyor...</span>
      </div>
    );
  }

  if (isHomeError) {
    return (
      <div className="space-y-4">
        <div role="alert">
          <Alert variant="destructive" title="Ana Sayfa Verileri Yüklenemedi">
            {homeError instanceof ApiError
              ? homeError.message
              : 'Öğrenci özet bilgileri alınırken bir hata oluştu.'}
          </Alert>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetchHome()}
          className="gap-1.5"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  const latestExam = homeData?.latestExam ?? null;
  const recentBadges = homeData?.recentBadges ?? [];
  const maxTrendNet = Math.max(
    1,
    ...trends.map((pt) => Number(pt.netScore) || 0)
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Hoş Geldin, {homeData?.studentName || 'Öğrenci'}
            </h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <GraduationCap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {homeData?.classroomName || 'Sınıf Atanmamış'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Sınav sonuçlarını girebilir, öğretmen onay durumunu takip edebilir ve yapay zeka destekli
            karnelerini inceleyebilirsin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/student/exams">
            <Button size="sm" className="gap-1.5">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Sınavlarım ve Sonuç Girişi
            </Button>
          </Link>
          <Link to="/student/profile">
            <Button variant="outline" size="sm">
              Profilim
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Grid: Latest Exam & Recent Badges */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Latest Finalized Exam Card */}
        <Card className="lg:col-span-7 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
                <CardTitle as="h2" className="text-base">
                  Son Kesinleşen Sınav Performansı
                </CardTitle>
              </div>
              {latestExam ? (
                <Badge variant="success">Kesinleşti</Badge>
              ) : (
                <Badge variant="secondary">Veri Yok</Badge>
              )}
            </div>
            <CardDescription>
              Öğretmen onayından geçmiş ve sıralaması hesaplanmış en güncel sınav sonucunuz.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {latestExam ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-foreground">
                      {latestExam.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{formatLocalDate(latestExam.examDate)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
                        Toplam Net
                      </span>
                      <span className="font-mono text-xl font-bold text-primary">
                        {Number(latestExam.netScore).toFixed(2)}
                      </span>
                    </div>
                    {latestExam.percentile != null ? (
                      <div className="text-right border-l pl-4">
                        <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
                          Yüzdelik Dilim
                        </span>
                        <span className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          %{Number(latestExam.percentile).toFixed(2)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link to={`/student/exams/${latestExam.examId}/dashboard`}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      Detaylı Karne ve AI Raporunu Gör
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center text-muted-foreground">
                <Trophy className="h-8 w-8 opacity-30" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground">
                  Henüz kesinleşmiş sınav sonucunuz bulunmuyor
                </p>
                <p className="max-w-sm text-xs">
                  Açık sınavlara doğru/yanlış sonuçlarınızı girdikten ve öğretmeniniz onayladıktan sonra
                  sınav karneniz burada yer alacaktır.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Badges Card */}
        <Card className="lg:col-span-5 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" aria-hidden="true" />
                <CardTitle as="h2" className="text-base">
                  Kazanılan Son Rozetler
                </CardTitle>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {recentBadges.length} Rozet
              </Badge>
            </div>
            <CardDescription>
              Sınav başarılarınıza göre kazandığınız motivasyon rozetleri.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {recentBadges.length > 0 ? (
              <ul className="space-y-2.5">
                {recentBadges.map((badge, idx) => (
                  <li
                    key={`${badge.code || badge.title}-${idx}`}
                    className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3"
                  >
                    <div className="rounded-full bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400 shrink-0">
                      <Award className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {badge.title}
                        </p>
                        {badge.examTitle ? (
                          <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                            {badge.examTitle}
                          </span>
                        ) : null}
                      </div>
                      {badge.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {badge.description}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-8 text-center text-muted-foreground">
                <Award className="h-8 w-8 opacity-30" aria-hidden="true" />
                <p className="text-xs">Henüz kazanılmış rozet bulunmuyor.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Net Score & Percentile Trend Section */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle as="h2" className="text-base">
                Net ve Yüzdelik Dilim Gelişim Grafiği
              </CardTitle>
            </div>
            <CardDescription>
              Kesinleşen sınavlardaki genel veya ders bazlı net gelişiminiz.
            </CardDescription>
          </div>

          <div className="w-full sm:w-64 space-y-1">
            <Label htmlFor="trend-subject-filter" className="text-xs text-muted-foreground">
              Ders Filtresi
            </Label>
            <Select
              id="trend-subject-filter"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              <option value="">Genel Toplam Net (Tüm Dersler)</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          {isLoadingTrends ? (
            <div className="flex h-36 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              <span>Gelişim verileri yükleniyor...</span>
            </div>
          ) : isTrendsError ? (
            <div role="alert" className="space-y-2">
              <Alert variant="destructive" title="Trend Verileri Alınamadı">
                {trendsError instanceof ApiError
                  ? trendsError.message
                  : 'Gelişim grafiği verileri yüklenirken hata oluştu.'}
              </Alert>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetchTrends()}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Tekrar Dene
              </Button>
            </div>
          ) : trends.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-10 text-center text-muted-foreground">
              <TrendingUp className="h-8 w-8 opacity-30" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">
                Seçilen filtre için henüz trend verisi bulunmuyor
              </p>
              <p className="text-xs">
                Onaylanmış ve kesinleştirilmiş sınav sonuçlarınız oluştuğunda gelişim grafiğiniz burada
                görüntülenecektir.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trends.map((point) => {
                const netVal = Number(point.netScore) || 0;
                const widthPercent = Math.min(
                  100,
                  Math.max(8, Math.round((netVal / maxTrendNet) * 100))
                );

                return (
                  <div
                    key={`${point.examId}-${point.examDate}`}
                    className="rounded-lg border bg-card p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{point.examName}</span>
                        <span className="text-muted-foreground">
                          ({formatLocalDate(point.examDate)})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="font-bold text-primary">
                          {netVal.toFixed(2)} Net
                        </span>
                        {point.percentile != null ? (
                          <Badge variant="outline" className="text-[11px]">
                            Dilim: %{Number(point.percentile).toFixed(2)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

