import * as React from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import type { StudentTrendReportDto } from '@/types/api';

export interface StudentWeaknessCardProps {
  historyReport: StudentTrendReportDto | null | undefined;
  onGenerateAiReport?: () => Promise<void>;
  isGeneratingReport?: boolean;
}

interface SubjectAggregate {
  subjectId: string;
  subjectName: string;
  totalCorrect: number;
  totalWrong: number;
  totalNet: number;
  examCount: number;
  avgNet: number;
}

export function StudentWeaknessCard({
  historyReport,
  onGenerateAiReport,
  isGeneratingReport = false,
}: StudentWeaknessCardProps) {
  const [generateMessage, setGenerateMessage] = React.useState<string | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const subjectAggregates = React.useMemo(() => {
    if (!historyReport?.examHistory || historyReport.examHistory.length === 0) {
      return [];
    }

    const map = new Map<string, SubjectAggregate>();

    historyReport.examHistory.forEach((exam) => {
      exam.subjectScores.forEach((ss) => {
        const existing = map.get(ss.subjectId) || {
          subjectId: ss.subjectId,
          subjectName: ss.subjectName,
          totalCorrect: 0,
          totalWrong: 0,
          totalNet: 0,
          examCount: 0,
          avgNet: 0,
        };

        existing.totalCorrect += ss.correctCount;
        existing.totalWrong += ss.wrongCount;
        existing.totalNet += ss.netScore;
        existing.examCount += 1;
        existing.avgNet = existing.totalNet / existing.examCount;

        map.set(ss.subjectId, existing);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.avgNet - a.avgNet);
  }, [historyReport]);

  const strongSubjects = subjectAggregates.slice(0, 2);
  const weakSubjects = subjectAggregates.length > 2
    ? subjectAggregates.slice(-2).reverse()
    : subjectAggregates.slice(1);

  const handleRequestAi = async () => {
    if (!onGenerateAiReport) return;
    try {
      await onGenerateAiReport();
      setGenerateMessage('Yapay zeka analiz raporu üretimi kuyruğa alındı.');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setGenerateMessage(null), 4000);
    } catch {
      // Handled in parent
    }
  };

  if (!historyReport || !historyReport.examHistory || historyReport.examHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <CardTitle as="h2" className="text-base">
              Konu ve Ders Zayıflık Analizi
            </CardTitle>
          </div>
          <CardDescription>
            Öğrencinin geçmiş sınav sonuçlarına göre güçlü ve geliştirilmesi gereken dersler.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center text-muted-foreground">
            <p className="text-sm font-medium text-foreground">Henüz sınav verisi bulunmuyor</p>
            <p className="text-xs">
              Öğrenci sınavlara katılıp sonuçlar onaylandığında ders analizleri burada listelenecektir.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            <CardTitle as="h2" className="text-base">
              Ders Güçlü &amp; Geliştirilmesi Gereken Yönler
            </CardTitle>
          </div>
          <CardDescription>
            Toplam {historyReport.totalExamsTaken} sınavın ortalamasına göre belirlenen performans göstergeleri.
          </CardDescription>
        </div>

        {onGenerateAiReport ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRequestAi}
            disabled={isGeneratingReport}
            className="gap-1.5 text-xs"
          >
            {isGeneratingReport ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            )}
            Öğrenciye Özel AI Raporu Üret
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {generateMessage ? (
          <div role="status" aria-live="polite">
            <Alert variant="default" title="Başarılı">
              {generateMessage}
            </Alert>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Strong Areas */}
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span>Güçlü Dersler (En Yüksek Ortalama Net)</span>
            </div>
            {strongSubjects.length === 0 ? (
              <p className="text-xs text-muted-foreground">Veri yetersiz.</p>
            ) : (
              <ul className="space-y-2">
                {strongSubjects.map((sub) => (
                  <li
                    key={sub.subjectId}
                    className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      <span className="font-semibold text-foreground">{sub.subjectName}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <Badge variant="success" className="text-xs">
                        {sub.avgNet.toFixed(2)} Net
                      </Badge>
                      <span className="text-muted-foreground text-[10px]">
                        ({sub.examCount} sınav)
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Weak Areas */}
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-semibold text-sm">
              <TrendingDown className="h-4 w-4 text-rose-600" aria-hidden="true" />
              <span>Geliştirilmesi Gereken Dersler (Öncelikli Odak)</span>
            </div>
            {weakSubjects.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tüm derslerde dengeli başarı.</p>
            ) : (
              <ul className="space-y-2">
                {weakSubjects.map((sub) => (
                  <li
                    key={sub.subjectId}
                    className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />
                      <span className="font-semibold text-foreground">{sub.subjectName}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <Badge variant="destructive" className="text-xs">
                        {sub.avgNet.toFixed(2)} Net
                      </Badge>
                      <span className="text-muted-foreground text-[10px]">
                        (Yanlış: {sub.totalWrong})
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Pedagogical Guidance Tip */}
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Öğretmen Tavsiyesi:</strong> Geliştirilmesi gereken derslerde öğrencinin yanlış
            yaptığı soru kökleri ve sınav ceza katsayısı dikkate alınarak konu eksiklikleri tespit
            edilebilir ve öğretmen gözlem notlarına eklenebilir.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

