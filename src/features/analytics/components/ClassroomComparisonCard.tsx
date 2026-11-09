import * as React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Check, Columns, Loader2, Sparkles, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClassroomComparisonQuery } from '../api/analyticsApi';
import type { ClassroomResponse, ExamResponse } from '@/types/api';

export interface ClassroomComparisonCardProps {
  availableClassrooms: ClassroomResponse[];
  availableExams: ExamResponse[];
  initialSelectedIds?: string[];
}

export function ClassroomComparisonCard({
  availableClassrooms,
  availableExams,
  initialSelectedIds = [],
}: ClassroomComparisonCardProps) {
  const [selectedClassroomIds, setSelectedClassroomIds] = React.useState<string[]>(() => {
    if (initialSelectedIds.length > 0) return initialSelectedIds;
    return availableClassrooms.slice(0, 2).map((c) => c.id);
  });
  const [selectedExamId, setSelectedExamId] = React.useState<string>('');

  React.useEffect(() => {
    if (selectedClassroomIds.length === 0 && availableClassrooms.length >= 2) {
      setSelectedClassroomIds(availableClassrooms.slice(0, 2).map((c) => c.id));
    }
  }, [availableClassrooms, selectedClassroomIds.length]);

  const {
    data: comparison,
    isLoading,
    isError,
    refetch,
  } = useClassroomComparisonQuery(selectedClassroomIds, selectedExamId || undefined);

  const toggleClassroom = (id: string) => {
    setSelectedClassroomIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((cId) => cId !== id);
      }
      return [...prev, id];
    });
  };

  const chartData = (comparison?.classrooms ?? []).map((c) => ({
    name: c.classroomName,
    avgScore: Number(c.avgScore) || 0,
    katilim: c.participationCount || 0,
    toplam: c.totalStudents || 0,
  }));

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Columns className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle as="h2" className="text-base">
                Sınıflar Arası Başarı ve Katılım Karşılaştırması
              </CardTitle>
            </div>
            <CardDescription>
              Seçilen sınıfların kesinleşmiş sınav net ortalamalarını ve katılım oranlarını kıyaslayın.
            </CardDescription>
          </div>

          {/* Exam Filter */}
          <div className="w-full sm:w-64 space-y-1">
            <Label htmlFor="comparison-exam-filter" className="text-xs text-muted-foreground">
              Karşılaştırılacak Sınav
            </Label>
            <Select
              id="comparison-exam-filter"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
            >
              <option value="">En Son Sınav (Otomatik)</option>
              {availableExams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} ({exam.examType})
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Classroom selector chips */}
        <div className="pt-3 space-y-1.5">
          <p className="text-xs font-medium text-foreground">Karşılaştırılacak Sınıfları Seçiniz:</p>
          <div className="flex flex-wrap gap-2">
            {availableClassrooms.map((cls) => {
              const isSelected = selectedClassroomIds.includes(cls.id);
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => toggleClassroom(cls.id)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span>{cls.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {selectedClassroomIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center text-muted-foreground">
            <Columns className="h-8 w-8 opacity-30" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">Karşılaştırma için sınıf seçiniz</p>
            <p className="text-xs">Yukarıdaki butonlara tıklayarak en az bir sınıf seçmelisiniz.</p>
          </div>
        ) : isLoading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            <span>Sınıf karşılaştırma verileri hesaplanıyor...</span>
          </div>
        ) : isError || !comparison ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
            <p className="font-semibold">Karşılaştırma verileri yüklenemedi</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
              Tekrar Dene
            </Button>
          </div>
        ) : comparison.classrooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 opacity-30" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              Seçilen kriterlere uygun veri bulunamadı
            </p>
            <p className="text-xs">
              Bu sınıflar için henüz kesinleşmiş sınav sonucu veya katılım bulunmuyor.
            </p>
          </div>
        ) : (
          <>
            {/* Visual Bar Comparison Chart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  {comparison.examTitle ? `"${comparison.examTitle}" — Net Ortalamaları` : 'Net Ortalaması Kıyaslaması'}
                </span>
                <span className="text-muted-foreground">
                  Tarih: {comparison.examDate || '—'}
                </span>
              </div>
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 'auto']} />
                    <Tooltip
                      formatter={(val: number | string, name: string) => {
                        if (name === 'Net Ortalaması') return [`${Number(val).toFixed(2)} Net`, name];
                        return [val, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="avgScore" name="Net Ortalaması" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Comparison Metrics Table */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Karşılaştırmalı Detay Tablosu</h3>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <caption className="sr-only">Seçili sınıfların başarı ve katılım karşılaştırması</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Sınıf Adı</TableHead>
                      <TableHead scope="col" className="text-right">Kayıtlı Öğrenci</TableHead>
                      <TableHead scope="col" className="text-right">Sınava Giren</TableHead>
                      <TableHead scope="col" className="text-right">Katılım Oranı</TableHead>
                      <TableHead scope="col" className="text-right">Sınıf Net Ortalaması</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.classrooms.map((row) => {
                      const total = row.totalStudents || row.studentCount || 0;
                      const entered = row.participationCount || row.participantCount || 0;
                      const rate = total > 0 ? (entered / total) * 100 : 0;

                      return (
                        <TableRow key={row.classroomId}>
                          <TableCell className="font-semibold text-foreground">
                            {row.classroomName}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{total}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{entered}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={rate >= 75 ? 'success' : 'secondary'} className="font-mono text-xs">
                              %{rate.toFixed(0)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary">
                            {(Number(row.avgScore) || 0).toFixed(2)} Net
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

