import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Award,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  History,
  RefreshCw,
  ShieldCheck,
  UserCheck,
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
import { useAppSelector } from '@/store';
import { ApiError } from '@/lib/api/error-parser';
import {
  studentPortalApi,
  useStudentHistoryQuery,
  useStudentHomeQuery,
} from '../api/studentPortalApi';

function formatDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function StudentProfilePage() {
  const user = useAppSelector((state) => state.auth.user);
  const {
    data: homeData,
    isLoading: isHomeLoading,
    isError: isHomeError,
    error: homeError,
    refetch: refetchHome,
    isFetching: isHomeFetching,
  } = useStudentHomeQuery();

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory,
  } = useStudentHistoryQuery(user?.id);

  const [lastUpdatedConsent, setLastUpdatedConsent] = useState<boolean | null>(null);
  const [consentMessage, setConsentMessage] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);

  const consentMutation = useMutation({
    mutationFn: (consent: boolean) => studentPortalApi.updateLeaderboardConsent(consent),
    onSuccess: (_data, consent) => {
      setConsentError(null);
      setLastUpdatedConsent(consent);
      setConsentMessage(
        consent
          ? 'Sınıf ilk 3 sıralamasında adınızın görünmesine izin verildi.'
          : 'Sınıf ilk 3 sıralamasında adınız anonim ("Gizli Öğrenci") olarak ayarlandı.'
      );
    },
    onError: (err) => {
      setConsentMessage(null);
      if (err instanceof ApiError) {
        setConsentError(err.message);
      } else {
        setConsentError('Görünürlük tercihi güncellenirken bir hata oluştu.');
      }
    },
  });

  const homeErrorMessage =
    homeError instanceof ApiError
      ? homeError.message
      : 'Profil bilgileri yüklenirken bir hata oluştu.';

  const historyErrorMessage =
    historyError instanceof ApiError
      ? historyError.message
      : 'Sınav geçmişi yüklenirken bir hata oluştu.';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <UserCheck className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Öğrenci Profili &amp; Gizlilik
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {homeData?.studentName ?? user?.username ?? 'Öğrenci Profili'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sınıf bilgilerinizi, liderlik tablosu görünürlük izninizi, kazandığınız rozetleri ve
            sınav sonuç geçmişinizi görüntüleyin.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void refetchHome();
            void refetchHistory();
          }}
          disabled={isHomeFetching}
        >
          <RefreshCw
            className={`mr-1.5 h-4 w-4 ${isHomeFetching ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Yenile
        </Button>
      </div>

      {isHomeError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold">Profil verileri alınamadı</p>
            <p className="text-xs mt-0.5">{homeErrorMessage}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetchHome()}>
            Tekrar Dene
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Identity Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle as="h2" className="text-base">
                Öğrenci Kimlik &amp; Sınıf Bilgileri
              </CardTitle>
            </div>
            <CardDescription>
              Kurum tarafından tanımlanan öğrenci ve sınıf kaydınız.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isHomeLoading ? (
              <div className="space-y-2 py-2" aria-busy="true">
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                <div className="h-4 w-64 animate-pulse rounded bg-muted" />
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <dt className="text-xs text-muted-foreground">Ad Soyad</dt>
                  <dd className="font-semibold mt-0.5">
                    {homeData?.studentName ?? user?.username ?? '—'}
                  </dd>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <dt className="text-xs text-muted-foreground">Sınıf / Şube</dt>
                  <dd className="font-semibold mt-0.5">
                    {homeData?.classroomName ?? 'Sınıf Atanmamış'}
                  </dd>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <dt className="text-xs text-muted-foreground">Kullanıcı Hesabı</dt>
                  <dd className="font-mono text-xs font-medium mt-0.5">
                    {user?.username ?? '—'}
                  </dd>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <dt className="text-xs text-muted-foreground">Sonuç Girilen Sınav Sayısı</dt>
                  <dd className="font-mono font-semibold mt-0.5">
                    {historyData?.totalExamsTaken ?? 0}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard Consent Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                <CardTitle as="h2" className="text-base">
                  Liderlik Tablosu İsim Görünürlüğü (KVKK Onayı)
                </CardTitle>
              </div>
              {lastUpdatedConsent !== null ? (
                <Badge variant={lastUpdatedConsent ? 'success' : 'secondary'}>
                  {lastUpdatedConsent ? 'Görünür (Açık)' : 'Anonim (Kapalı)'}
                </Badge>
              ) : null}
            </div>
            <CardDescription>
              Sınıf ilk 3 (Top 3) başarı sıralamasına girdiğinizde adınızın diğer öğrencilere ve
              paylaşılan karnelere açık olarak gösterilip gösterilmeyeceğini belirleyin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant={lastUpdatedConsent === true ? 'default' : 'outline'}
                disabled={consentMutation.isPending}
                onClick={() => consentMutation.mutate(true)}
              >
                <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Sıralamada Görünür Yap (Açık)
              </Button>
              <Button
                type="button"
                variant={lastUpdatedConsent === false ? 'default' : 'outline'}
                disabled={consentMutation.isPending}
                onClick={() => consentMutation.mutate(false)}
              >
                <EyeOff className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Sıralamada Anonimleştir (Kapalı)
              </Button>
            </div>

            {consentMessage ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{consentMessage}</span>
              </div>
            ) : null}

            {consentError ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {consentError}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Earned Badges */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" aria-hidden="true" />
            <CardTitle as="h2" className="text-base">
              Kazanılan Rozetler
            </CardTitle>
          </div>
          <CardDescription>
            Kesinleşmiş sınavlardaki başarılarınıza göre otomatik olarak verilen rozetler.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isHomeLoading ? (
            <div className="grid gap-3 sm:grid-cols-3" aria-busy="true">
              <div className="h-16 animate-pulse rounded bg-muted" />
              <div className="h-16 animate-pulse rounded bg-muted" />
              <div className="h-16 animate-pulse rounded bg-muted" />
            </div>
          ) : !homeData?.recentBadges || homeData.recentBadges.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Henüz kazanılmış rozet bulunmuyor.
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {homeData.recentBadges.map((badge) => (
                <li
                  key={`${badge.code}-${badge.awardedAt}`}
                  className="flex items-center justify-between rounded-lg border bg-card p-3.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
                      <Award className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{badge.title || badge.code}</p>
                      <p className="text-xs text-muted-foreground">
                        Kazanım: {formatDate(badge.awardedAt)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Kazanıldı</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Exam History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" aria-hidden="true" />
            <CardTitle as="h2" className="text-base">
              Sınav Sonuç Geçmişi
            </CardTitle>
          </div>
          <CardDescription>
            Sonuç girdiğiniz sınavların net özeti ve sıralama/kesinleşme durumu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isHistoryLoading ? (
            <div className="space-y-2 py-4" aria-busy="true">
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
            </div>
          ) : isHistoryError ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between"
            >
              <span>{historyErrorMessage}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetchHistory()}
              >
                Tekrar Dene
              </Button>
            </div>
          ) : !historyData?.examHistory || historyData.examHistory.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Henüz sonuç girilmiş sınav geçmişiniz bulunmuyor.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sınav Adı</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum / Sıralama</TableHead>
                  <TableHead className="text-right">Toplam Net</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData.examHistory.map((item) => {
                  const isRankedAndFinalized = item.classRank != null;
                  return (
                    <TableRow key={item.examId}>
                      <TableCell className="font-medium">{item.examTitle}</TableCell>
                      <TableCell>{formatDate(item.examDate)}</TableCell>
                      <TableCell>
                        {isRankedAndFinalized ? (
                          <Badge variant="success">
                            Kesinleşti (Sınıf #{item.classRank})
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Onay / Kesinleşme Bekliyor</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-primary">
                        {item.totalScore.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isRankedAndFinalized ? (
                          <Link to={`/student/exams/${item.examId}/dashboard`}>
                            <Button type="button" variant="outline" size="sm">
                              Karneyi Aç
                            </Button>
                          </Link>
                        ) : (
                          <Link to="/student/exams">
                            <Button type="button" variant="ghost" size="sm">
                              Sınavlara Git
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
