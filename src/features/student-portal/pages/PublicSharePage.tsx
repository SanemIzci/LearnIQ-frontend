import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  BarChart3,
  GraduationCap,
  Printer,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError } from '@/lib/api/error-parser';
import { usePublicShareQuery } from '../api/studentPortalApi';

export function PublicSharePage() {
  const { token } = useParams<{ token: string }>();
  const {
    data: snapshot,
    isLoading,
    isError,
    error,
    refetch,
  } = usePublicShareQuery(token);

  const errorMessage =
    error instanceof ApiError
      ? error.message
      : 'Paylaşım bağlantısı geçersiz, süresi dolmuş veya iptal edilmiş olabilir.';

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top Banner */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">
                  Paylaşılan Öğrenci Sınav Karnesi
                </h1>
                <Badge variant="secondary">Salt Okunur Anlık Görüntü</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                LearnIQ kriptografik imzalı sınav sonuç özeti
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            {snapshot ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Yazdır / PDF
              </Button>
            ) : null}
            <Link to="/login">
              <Button type="button" variant="ghost" size="sm">
                Giriş Ekranı
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <Card aria-busy="true">
            <CardContent className="py-12 text-center space-y-3">
              <div className="mx-auto h-8 w-48 animate-pulse rounded bg-muted" />
              <p className="text-sm text-muted-foreground">
                Paylaşılan karne doğrulanıyor ve yükleniyor...
              </p>
            </CardContent>
          </Card>
        ) : isError || !snapshot ? (
          <Card className="border-destructive/40">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                <CardTitle as="h2" className="text-base">
                  Karne Görüntülenemedi
                </CardTitle>
              </div>
              <CardDescription>
                Paylaşım bağlantısı doğrulanamadı veya geçerlilik süresi sona erdi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {errorMessage}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                  Tekrar Dene
                </Button>
                <Link to="/login">
                  <Button type="button" variant="default" size="sm">
                    Öğrenci Girişine Git
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 5 Scorecard Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Toplam Net</CardDescription>
                  <CardTitle className="text-2xl font-mono text-primary">
                    {snapshot.netScore.toFixed(2)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Kesinleşmiş net skoru</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Sınıf Sıralaması</CardDescription>
                  <CardTitle className="text-2xl font-mono">
                    {snapshot.classRank != null && snapshot.classRank > 0
                      ? `#${snapshot.classRank}`
                      : '—'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Sınıf içi derece</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Okul Sıralaması</CardDescription>
                  <CardTitle className="text-2xl font-mono">
                    {snapshot.schoolRank != null && snapshot.schoolRank > 0
                      ? `#${snapshot.schoolRank}`
                      : '—'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Kurum geneli derece</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Yüzdelik Dilim</CardDescription>
                  <CardTitle className="text-2xl font-mono text-emerald-600 dark:text-emerald-400">
                    {snapshot.percentile != null ? `%${snapshot.percentile.toFixed(1)}` : '—'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Başarı yüzdeliği</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Sınıf Ortalaması</CardDescription>
                  <CardTitle className="text-2xl font-mono">
                    {snapshot.classAverage != null ? snapshot.classAverage.toFixed(2) : '—'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Sınıf net ortalaması</p>
                </CardContent>
              </Card>
            </div>

            {/* Top 3 Leaderboard Snapshot */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
                    <CardTitle as="h2" className="text-base">
                      Sınıf İlk 3 Başarı Sıralaması
                    </CardTitle>
                  </div>
                  <Badge variant="outline">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    KVKK Uyumlu Görünüm
                  </Badge>
                </div>
                <CardDescription>
                  Liderlik tablosu görünürlük izni vermeyen öğrenciler &ldquo;Gizli Öğrenci&rdquo;
                  olarak listelenir.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!snapshot.top3Students || snapshot.top3Students.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    <Users className="mx-auto h-6 w-6 mb-1.5 opacity-60" aria-hidden="true" />
                    Sınıf sıralama verisi bulunmuyor.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Derece</TableHead>
                        <TableHead>Öğrenci</TableHead>
                        <TableHead className="text-right">Net Skoru</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snapshot.top3Students.map((student) => (
                        <TableRow key={`${student.rank}-${student.displayName ?? 'anon'}`}>
                          <TableCell className="font-mono font-bold">
                            <span className="inline-flex items-center gap-1">
                              <Award className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />#
                              {student.rank}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">
                            {student.displayName ?? student.maskedName ?? 'Gizli Öğrenci'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-primary">
                            {student.netScore.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Footer note */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="inline-flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                Bu karne paylaşım anındaki kesinleşmiş sınav verilerini yansıtır.
              </span>
              <span>LearnIQ Akademik Analitik Platformu</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
