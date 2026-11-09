import * as React from 'react';
import {
  Calculator,
  CheckCircle2,
  HelpCircle,
  Loader2,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useExamRulesQuery } from '../api/examRulesApi';
import { ExamRuleEnsureDialog } from '../components/ExamRuleEnsureDialog';
import { useAdministrationSubjectsQuery } from '@/features/administration/api/administrationApi';
import type { SubjectResponse } from '@/types/api';

const EXAM_TYPES = [
  { key: 'TYT', label: 'TYT (Temel Yeterlilik)', defaultDivisor: 4.0 },
  { key: 'AYT', label: 'AYT (Alan Yeterlilik)', defaultDivisor: 4.0 },
  { key: 'YDT', label: 'YDT (Yabancı Dil)', defaultDivisor: 4.0 },
  { key: 'LGS', label: 'LGS (Liseye Geçiş)', defaultDivisor: 3.0 },
  { key: 'YKS', label: 'YKS (Genel)', defaultDivisor: 4.0 },
];

export function ExamRulesPage() {
  const [activeExamType, setActiveExamType] = React.useState<string>('TYT');
  const [selectedSubjectForRule, setSelectedSubjectForRule] = React.useState<SubjectResponse | null>(null);

  const subjectsQuery = useAdministrationSubjectsQuery();
  const rulesQuery = useExamRulesQuery(activeExamType);

  const subjects = subjectsQuery.data || [];
  const rules = rulesQuery.data || [];

  const rulesMap = React.useMemo(() => {
    const map = new Map<string, { questionCount: number; penaltyDivisor: number }>();
    rules.forEach((r) => {
      map.set(r.subjectId, {
        questionCount: r.questionCount,
        penaltyDivisor: Number(r.penaltyDivisor),
      });
    });
    return map;
  }, [rules]);

  const activeConfig = EXAM_TYPES.find((t) => t.key === activeExamType) || EXAM_TYPES[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Calculator className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Ölçme &amp; Değerlendirme Kuralları
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Sınav Tipi Net Hesaplama Kuralları
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Öğrenci sınav sonuçlarının net puanlarının doğru hesaplanabilmesi için sınav tipi bazında soru sayısı ve ceza katsayılarını belirleyin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void rulesQuery.refetch();
              void subjectsQuery.refetch();
            }}
            disabled={rulesQuery.isFetching}
            className="gap-1.5"
            aria-label="Kuralları yenile"
          >
            <RefreshCw className={`h-4 w-4 ${rulesQuery.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span className="hidden sm:inline">Yenile</span>
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <div role="status">
        <Alert variant="default" title="Standart Net Formülü Kuralı">
          <p className="text-xs">
            ÖSYM ve MEB standartları gereğince LGS sınavlarında <strong>3 yanlış 1 doğruyu</strong>, YKS / TYT / AYT sınavlarında ise <strong>4 yanlış 1 doğruyu</strong> götürmektedir. Sınava ders eklenmeden önce net hesaplama kuralının tanımlı olması zorunludur.
          </p>
        </Alert>
      </div>

      {/* Exam Type Tabs */}
      <div
        role="tablist"
        aria-label="Sınav Tipleri"
        className="flex border-b text-xs font-medium overflow-x-auto"
      >
        {EXAM_TYPES.map((type) => {
          const isActive = activeExamType === type.key;
          return (
            <button
              key={type.key}
              role="tab"
              id={`exam-tab-${type.key}`}
              aria-selected={isActive}
              aria-controls="exam-rules-tabpanel"
              type="button"
              onClick={() => setActiveExamType(type.key)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-semibold transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{type.label}</span>
              <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px] font-mono">
                {type.defaultDivisor} Yanlış = 1 Doğru
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Rules Table */}
      <Card
        role="tabpanel"
        id="exam-rules-tabpanel"
        aria-labelledby={`exam-tab-${activeExamType}`}
        className="shadow-sm"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle as="h2" className="text-base font-semibold">
                {activeConfig.key} İçin Ders Net Kuralları
              </CardTitle>
              <CardDescription className="text-xs">
                {activeConfig.label} sınavında geçerli olan ders bazlı katsayılar ve soru sınırları.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              Tanımlı: {rules.length} / {subjects.length} Ders
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjectsQuery.isLoading || rulesQuery.isLoading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              <span>Net kuralları yükleniyor...</span>
            </div>
          ) : subjects.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              Kurumunuzda henüz tanımlanmış bir ders bulunmuyor. Önce &quot;Ders ve Konu Yönetimi&quot; ekranından ders ekleyiniz.
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <caption className="sr-only">{activeConfig.key} sınav kuralları listesi</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Ders Adı</TableHead>
                    <TableHead scope="col">Soru Sayısı Sınırı</TableHead>
                    <TableHead scope="col">Ceza Böleni (Divisor)</TableHead>
                    <TableHead scope="col">Hesaplama Formülü</TableHead>
                    <TableHead scope="col">Kural Durumu</TableHead>
                    <TableHead scope="col" className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => {
                    const rule = rulesMap.get(subject.id);
                    const isConfigured = Boolean(rule);

                    return (
                      <TableRow key={subject.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground text-sm">
                            {subject.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {subject.id}
                          </div>
                        </TableCell>

                        <TableCell>
                          {rule ? (
                            <span className="font-mono font-semibold text-sm">
                              {rule.questionCount} Soru
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">
                              Varsayılan (40)
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {rule ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              {rule.penaltyDivisor.toFixed(1)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">
                              {activeConfig.defaultDivisor.toFixed(1)} (Otomatik)
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {rule ? (
                            <span>
                              Net = D - (Y / {rule.penaltyDivisor.toFixed(0)})
                            </span>
                          ) : (
                            <span>
                              Net = D - (Y / {activeConfig.defaultDivisor.toFixed(0)})
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {isConfigured ? (
                            <Badge variant="success" className="gap-1 text-[11px]">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              Kural Tanımlı
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 text-[11px] text-muted-foreground">
                              <HelpCircle className="h-3 w-3" aria-hidden="true" />
                              Kural Eksik
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant={isConfigured ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => setSelectedSubjectForRule(subject)}
                            className="h-8 text-xs gap-1"
                            aria-label={`${subject.name} dersi için ${activeConfig.key} net kuralını düzenle`}
                          >
                            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{isConfigured ? 'Kuralı Düzenle' : 'Kural Tanımla'}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rule Dialog */}
      {selectedSubjectForRule ? (
        <ExamRuleEnsureDialog
          open={Boolean(selectedSubjectForRule)}
          onOpenChange={(open) => {
            if (!open) setSelectedSubjectForRule(null);
          }}
          examType={activeExamType}
          subjectId={selectedSubjectForRule.id}
          subjectName={selectedSubjectForRule.name}
          onRuleEnsured={() => {
            void rulesQuery.refetch();
          }}
        />
      ) : null}
    </div>
  );
}
