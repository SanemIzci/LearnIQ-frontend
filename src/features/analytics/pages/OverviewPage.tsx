import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  GraduationCap,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppSelector } from '@/store';
import { cn } from '@/lib/utils';
import {
  useAdminDashboardQuery,
  useAdminSubjectScorecardQuery,
  useAnalyticsClassroomsQuery,
  useAnalyticsExamsQuery,
} from '../api/analyticsApi';
import { ClassroomComparisonCard } from '../components/ClassroomComparisonCard';

export function OverviewPage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const {
    data: adminDashboard,
    isLoading: isLoadingAdmin,
    isError: isAdminError,
    refetch: refetchAdmin,
  } = useAdminDashboardQuery();

  const { data: subjectScorecard } = useAdminSubjectScorecardQuery();
  const { data: classrooms = [] } = useAnalyticsClassroomsQuery();
  const { data: exams = [] } = useAnalyticsExamsQuery();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isAdmin ? 'Kurum & Yönetici Analitiği' : 'Öğretmen Analitik Özeti'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Akademik Genel Bakış &amp; Sınıf Karşılaştırması
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kurum genelindeki sınıfların başarı ortalamalarını, sınav katılım oranlarını ve ders bazlı
            performanslarını inceleyin.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void refetchAdmin();
          }}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Yenile
        </Button>
      </div>

      {/* Admin KPI Cards (When Admin) */}
      {isAdmin && (
        <>
          {isLoadingAdmin ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              <span>Yönetici analitik panosu yükleniyor...</span>
            </div>
          ) : isAdminError || !adminDashboard ? (
            <div className="rounded-lg border border-muted p-4 text-sm text-muted-foreground">
              Yönetici analitik panosu verisi henüz hazır değil veya veri bulunmuyor.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Toplam Sınıf Sayısı</CardDescription>
                  <CardTitle className="text-2xl font-mono text-primary">
                    {adminDashboard.classroomCount}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Aktif şube ve sınıf mevcudu</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Pozitif Trend Gösterenler</CardDescription>
                  <CardTitle className="text-2xl font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <TrendingUp className="h-5 w-5" aria-hidden="true" />
                    {adminDashboard.classrooms.reduce((acc, c) => acc + (c.upTrendCount || 0), 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Son sınavda net artıran dersler</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Gelişim İhtiyacı Olanlar</CardDescription>
                  <CardTitle className="text-2xl font-mono text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <TrendingDown className="h-5 w-5" aria-hidden="true" />
                    {adminDashboard.classrooms.reduce((acc, c) => acc + (c.downTrendCount || 0), 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Son sınavda net düşüşü yaşayanlar</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Kurum Sınav Sayısı</CardDescription>
                  <CardTitle className="text-2xl font-mono">{exams.length}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Oluşturulan toplam deneme sınavı</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Admin Classrooms Performance Grid */}
          {adminDashboard && adminDashboard.classrooms.length > 0 ? (
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
                  <CardTitle as="h2" className="text-base">
                    Sınıf Bazlı Son Durum ve Başarı Özeti
                  </CardTitle>
                </div>
                <CardDescription>
                  Her sınıfın en son sınavdaki başarı karnesi ve güçlü/zayıf ders analizi.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {adminDashboard.classrooms.map((cls) => (
                    <div
                      key={cls.classroomId}
                      className="rounded-lg border bg-card p-4 space-y-3 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 border-b pb-2">
                        <div>
                          <h3 className="font-bold text-sm text-foreground">{cls.classroomName}</h3>
                          {cls.latestExamTitle ? (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                              {cls.latestExamTitle}
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">Sınav verisi yok</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {cls.avgNet != null ? `${Number(cls.avgNet).toFixed(2)} Net` : '—'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded bg-muted/30 p-2 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground block">En Başarılı Ders</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 block truncate">
                            {cls.bestSubjectName || '—'}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {cls.bestSubjectNet != null ? `${Number(cls.bestSubjectNet).toFixed(1)} Net` : ''}
                          </span>
                        </div>

                        <div className="rounded bg-muted/30 p-2 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground block">Gelişim Alanı</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400 block truncate">
                            {cls.worstSubjectName || '—'}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {cls.worstSubjectNet != null ? `${Number(cls.worstSubjectNet).toFixed(1)} Net` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t">
                        <span className="text-muted-foreground text-[11px]">
                          Katılım: %{cls.participationRate != null ? Number(cls.participationRate).toFixed(0) : 0}
                        </span>
                        <Link
                          to={`/staff/classrooms/${cls.classroomId}/analytics`}
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-7 text-xs gap-1')}
                        >
                          Analitiği Gör
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Subject Scorecard (Admin only) */}
          {subjectScorecard && subjectScorecard.subjects.length > 0 ? (
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                  <CardTitle as="h2" className="text-base">
                    Ders Performans Karnesi (Tüm Kurum)
                  </CardTitle>
                </div>
                <CardDescription>
                  Kurum genelindeki tüm sınıfların ders bazlı en yüksek, en düşük ve ortalama net puanları.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <caption className="sr-only">Kurum geneli ders başarı karnesi</caption>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col">Ders</TableHead>
                        <TableHead scope="col" className="text-right">Sınıf Sayısı</TableHead>
                        <TableHead scope="col" className="text-right">En Yüksek Net</TableHead>
                        <TableHead scope="col" className="text-right">En Düşük Net</TableHead>
                        <TableHead scope="col" className="text-right">Ortalama Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjectScorecard.subjects.map((sub) => (
                        <TableRow key={sub.subjectId}>
                          <TableCell className="font-semibold text-foreground">{sub.subjectName}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{sub.classroomCount}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                            {Number(sub.maxNet).toFixed(2)} Net ({sub.bestClassroomName || '—'})
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-rose-600 dark:text-rose-400">
                            {Number(sub.minNet).toFixed(2)} Net ({sub.worstClassroomName || '—'})
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary">
                            {Number(sub.avgNet).toFixed(2)} Net
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {/* Classroom Comparison Section (Both Admin and Teacher) */}
      <ClassroomComparisonCard
        availableClassrooms={classrooms}
        availableExams={exams}
      />
    </div>
  );
}
