import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  Printer,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { useAppDispatch, useAppSelector } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { ApiError } from '@/lib/api/error-parser';
import { studentPortalApi, useStudentAiReportQuery } from '../api/studentPortalApi';

export interface AiReportCardProps {
  examId: string;
}

export function AiReportCard({ examId }: AiReportCardProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  const [isRequesting, setIsRequesting] = React.useState(false);
  const [requestError, setRequestError] = React.useState<string | null>(null);

  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
  } = useStudentAiReportQuery(examId);

  const isNotFound = isError && error instanceof ApiError && error.status === 404;

  const handleRequestReport = async () => {
    setIsRequesting(true);
    setRequestError(null);

    try {
      const created = await studentPortalApi.requestAiReport(examId);
      queryClient.setQueryData(
        tenantQueryKey(tenantId, 'student-ai-report', examId),
        created
      );
      await queryClient.invalidateQueries({
        queryKey: tenantQueryKey(tenantId, 'student-ai-report', examId),
      });
      dispatch(
        pushToast({
          title: 'AI Rapor Talebi Alındı',
          description: 'Yapay zeka performans analiziniz hazırlanmaya başladı.',
        })
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setRequestError(
          err.message ||
            'Yapay zeka raporu talep edilirken bir hata oluştu. Sınavın kesinleşmiş ve sonucunuzun onaylanmış olduğundan emin olun.'
        );
      } else {
        setRequestError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'COMPLETED' || status === 'READY') {
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          Hazır
        </Badge>
      );
    }
    if (status === 'PENDING' || status === 'PROCESSING') {
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          Hazırlanıyor
        </Badge>
      );
    }
    if (status === 'FAILED') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          Başarısız
        </Badge>
      );
    }
    return <Badge variant="secondary">Talep Edilmedi</Badge>;
  };

  const isCompletedOrReady =
    report?.status === 'COMPLETED' || report?.status === 'READY';
  const isPendingOrProcessing =
    report?.status === 'PENDING' || report?.status === 'PROCESSING';

  return (
    <Card className="border-primary/20 shadow-sm print:border-none print:shadow-none">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b bg-muted/20 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
            <CardTitle as="h2" className="text-lg">
              Yapay Zeka Performans ve Konu Analiz Raporu
            </CardTitle>
            {getStatusBadge(report?.status)}
          </div>
          <CardDescription>
            Ders bazlı netlerinize ve yüzdelik diliminize göre kişiselleştirilmiş çalışma önerileri.
          </CardDescription>
        </div>

        {isCompletedOrReady ? (
          <div className="flex items-center gap-2 print:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Yazdır / PDF Olarak Kaydet
            </Button>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {requestError ? (
          <div role="alert" aria-live="polite" className="print:hidden">
            <Alert variant="destructive" title="AI Raporu Oluşturulamadı">
              {requestError}
            </Alert>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            <span>Yapay zeka rapor durumu kontrol ediliyor...</span>
          </div>
        ) : isNotFound || (!report && !isError) ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="max-w-md space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Henüz Yapay Zeka Analiz Raporu Oluşturulmadı
              </p>
              <p className="text-xs text-muted-foreground">
                Sınav kesinleştikten ve sonucunuz öğretmen tarafından onaylandıktan sonra yapay zeka
                destekli güçlü/zayıf yön analizinizi oluşturabilirsiniz.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleRequestReport}
              disabled={isRequesting}
              className="mt-1 gap-1.5"
            >
              {isRequesting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              Yapay Zeka Analiz Raporu Oluştur
            </Button>
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-3">
            <Alert variant="destructive" title="Rapor Durumu Alınamadı">
              {error instanceof ApiError
                ? error.message
                : 'Yapay zeka rapor bilgisi yüklenirken bir hata oluştu.'}
            </Alert>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Tekrar Dene
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleRequestReport}
                disabled={isRequesting}
                className="gap-1.5 text-xs"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Yeni Rapor Talep Et
              </Button>
            </div>
          </div>
        ) : isPendingOrProcessing ? (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center justify-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-8 text-center"
          >
            <Loader2 className="h-7 w-7 animate-spin text-amber-600" aria-hidden="true" />
            <div className="space-y-1 max-w-md">
              <p className="text-sm font-semibold text-foreground">
                Yapay Zeka Raporunuz Hazırlanıyor ({report?.status})
              </p>
              <p className="text-xs text-muted-foreground">
                Ders bazlı netleriniz ve yüzdelik diliminiz analiz ediliyor. Bu ekran her 3 saniyede bir
                otomatik olarak güncellenmektedir.
              </p>
            </div>
          </div>
        ) : report?.status === 'FAILED' ? (
          <div role="alert" className="space-y-3">
            <Alert variant="destructive" title="Rapor Üretimi Başarısız Oldu">
              Yapay zeka servisi raporu oluştururken geçici bir sorunla karşılaştı. Lütfen tekrar deneyin.
            </Alert>
            <Button
              type="button"
              onClick={handleRequestReport}
              disabled={isRequesting}
              size="sm"
              className="gap-1.5 text-xs"
            >
              {isRequesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Tekrar Rapor Oluştur
            </Button>
          </div>
        ) : isCompletedOrReady ? (
          <div className="space-y-4">
            <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-card p-5 text-foreground leading-relaxed space-y-3 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_td]:border [&_td]:px-3 [&_td]:py-1.5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report?.summary || 'Rapor özeti mevcut değil.'}
              </ReactMarkdown>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

