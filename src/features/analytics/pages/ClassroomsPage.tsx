import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { tenantQueryKey } from '@/lib/api/queryClient';
import {
  analyticsApi,
  useAnalyticsClassroomsQuery,
  useAnalyticsSubjectsQuery,
} from '../api/analyticsApi';
import { ObservationDialog } from '../components/ObservationDialog';
import type { ObservationFormValues } from '../schemas/observationSchemas';
import type { ClassroomResponse } from '@/types/api';

export function ClassroomsPage() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  const {
    data: classrooms = [],
    isLoading,
    isError,
    refetch,
  } = useAnalyticsClassroomsQuery();
  const { data: subjects = [] } = useAnalyticsSubjectsQuery();

  const [selectedClassroomForObs, setSelectedClassroomForObs] = React.useState<ClassroomResponse | null>(null);

  const handleSaveObservation = async (payload: ObservationFormValues) => {
    if (!selectedClassroomForObs) return;
    await analyticsApi.createObservation(selectedClassroomForObs.id, {
      content: payload.content,
      subjectId: payload.subjectId || undefined,
      examId: payload.examId || undefined,
      tags: payload.tags,
    });
    void queryClient.invalidateQueries({
      queryKey: tenantQueryKey(tenantId, 'classroom-observations', selectedClassroomForObs.id),
    });
    void queryClient.invalidateQueries({
      queryKey: tenantQueryKey(tenantId, 'my-teacher-observations'),
    });
    dispatch(
      pushToast({
        title: 'Gözlem Notu Eklendi',
        description: `"${selectedClassroomForObs.name}" sınıfı için gözlem notu kaydedildi.`,
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Sınıf Analitik ve Gözlem Merkezi
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Sınıflar &amp; Performans Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kurumdaki şubeleri inceleyin, başarı analizlerine ulaşın ve öğretmen gözlem notları ekleyin.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Yenile
        </Button>
      </div>

      {/* Classroom List Cards */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          <span>Sınıf listesi yükleniyor...</span>
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          <p className="font-semibold">Sınıflar yüklenemedi</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} className="mt-2">
            Tekrar Dene
          </Button>
        </div>
      ) : classrooms.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <GraduationCap className="mx-auto h-8 w-8 opacity-40 mb-2" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Kayıtlı sınıf bulunamadı</p>
          <p className="text-xs">Sınıf kayıtları oluşturulduğunda burada listelenecektir.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((cls) => (
            <Card key={cls.id} className="hover:border-primary/40 transition-colors shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
                    <CardTitle as="h2" className="text-base">
                      {cls.name}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Aktif Şube
                  </Badge>
                </div>
                <CardDescription>
                  Sınıf başarı karnesi, katılım grafiği ve öğretmen gözlemleri.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2.5">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    Detaylı İstatistikler
                  </span>
                  <span className="font-mono text-primary font-semibold">Hazır</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedClassroomForObs(cls)}
                    className="h-8 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Gözlem Ekle
                  </Button>
                  <Link
                    to={`/staff/classrooms/${cls.id}/analytics`}
                    className={cn(buttonVariants({ size: 'sm' }), 'h-8 text-xs gap-1')}
                  >
                    <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                    Analitiği Aç
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Observation Modal */}
      {selectedClassroomForObs ? (
        <ObservationDialog
          open={Boolean(selectedClassroomForObs)}
          onOpenChange={(open) => {
            if (!open) setSelectedClassroomForObs(null);
          }}
          classroomId={selectedClassroomForObs.id}
          classroomName={selectedClassroomForObs.name}
          subjects={subjects}
          onSave={handleSaveObservation}
        />
      ) : null}
    </div>
  );
}
