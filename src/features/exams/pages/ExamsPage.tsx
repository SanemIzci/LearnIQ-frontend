import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit2,
  GraduationCap,
  Loader2,
  Lock,
  Plus,
  Search,
  Trash2,
  Unlock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import { useExamsQuery } from '../api/examsApi';
import { CreateExamDialog } from '../components/CreateExamDialog';
import { EditExamDialog } from '../components/EditExamDialog';
import { DeleteExamDialog } from '../components/DeleteExamDialog';
import { ExamSubjectsDialog } from '../components/ExamSubjectsDialog';
import { ExamClassroomsDialog } from '../components/ExamClassroomsDialog';
import { formatLocalDate } from '@/lib/utils';
import type { ExamResponse } from '@/types/api';

function getStatusBadge(status: string) {
  if (status === 'FINALIZED') {
    return (
      <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground gap-1">
        <Lock className="h-3 w-3" aria-hidden="true" />
        Kesinleştirildi
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1">
      <Unlock className="h-3 w-3" aria-hidden="true" />
      Açık
    </Badge>
  );
}

function getExamTypeBadge(type: string) {
  const normalized = type?.toUpperCase() || '';
  if (normalized.includes('TYT') || normalized.includes('AYT') || normalized.includes('YKS')) {
    return <Badge variant="default" className="font-mono text-xs">{type}</Badge>;
  }
  if (normalized.includes('LGS')) {
    return <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 font-mono text-xs">{type}</Badge>;
  }
  return <Badge variant="outline" className="font-mono text-xs">{type}</Badge>;
}

export function ExamsPage() {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [page, setPage] = React.useState(0);
  const pageSize = 15;

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingExam, setEditingExam] = React.useState<ExamResponse | null>(null);
  const [deletingExam, setDeletingExam] = React.useState<ExamResponse | null>(null);
  const [managingSubjectsExam, setManagingSubjectsExam] = React.useState<ExamResponse | null>(null);
  const [managingClassroomsExam, setManagingClassroomsExam] = React.useState<ExamResponse | null>(null);

  // Debounce search input
  const isFirstSearchRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error } = useExamsQuery({
    page,
    size: pageSize,
    sort: 'examDate,desc',
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.totalElements / pageSize)) : 1;

  // Client-side filtering on current page content (or backend if supported)
  const filteredExams = React.useMemo(() => {
    if (!data?.content) return [];
    return data.content.filter((exam) => {
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const matchesTitle = exam.title?.toLowerCase().includes(query);
        const matchesType = exam.examType?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesType) return false;
      }
      if (typeFilter && exam.examType !== typeFilter) {
        return false;
      }
      if (statusFilter && exam.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [data?.content, debouncedSearch, typeFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Sınav Yaşam Döngüsü ve Yönetimi
            </h1>
            {data ? (
              <Badge variant="secondary" className="font-mono">
                {Boolean(debouncedSearch || typeFilter || statusFilter)
                  ? `${filteredExams.length} / ${data.totalElements} Sınav`
                  : `${data.totalElements} Sınav`}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Kurum genelindeki deneme sınavları, ders ve sınıf atamaları, sonuç inceleme ve kesinleştirme.
          </p>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Yeni Sınav Oluştur
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Sınav adına göre ara..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            aria-label="Sınav Ara"
          />
        </div>

        <div className="w-full sm:w-44">
          <Select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            aria-label="Sınav Türü Filtresi"
          >
            <option value="">Tüm Sınav Türleri</option>
            <option value="TYT">TYT</option>
            <option value="AYT">AYT</option>
            <option value="YKS">YKS</option>
            <option value="LGS">LGS</option>
            <option value="DENEME">DENEME</option>
            <option value="KTT">KTT</option>
          </Select>
        </div>

        <div className="w-full sm:w-40">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            aria-label="Sınav Durumu Filtresi"
          >
            <option value="">Tüm Durumlar</option>
            <option value="OPEN">Açık</option>
            <option value="FINALIZED">Kesinleştirildi</option>
          </Select>
        </div>
      </div>

      {/* Error state */}
      {error ? (
        <Alert variant="destructive" title="Yükleme Hatası">
          Sınav listesi yüklenirken bir sorun oluştu. Lütfen bağlantınızı kontrol edin.
        </Alert>
      ) : null}

      {/* Exams Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sınav Adı</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Dersler</TableHead>
              <TableHead>Sınıflar</TableHead>
              <TableHead className="text-right">Aksiyonlar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    <span>Sınavlar yükleniyor...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? null : filteredExams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-40" aria-hidden="true" />
                  Kayıtlı sınav bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              filteredExams.map((exam) => {
                const isFinalized = exam.status === 'FINALIZED';

                return (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex flex-col">
                        <span>{exam.title}</span>
                        {isFinalized && exam.finalizedAt ? (
                          <span className="text-[11px] text-muted-foreground">
                            Kesinleştirildi: {new Date(exam.finalizedAt).toLocaleDateString('tr-TR')}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{getExamTypeBadge(exam.examType)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{formatLocalDate(exam.examDate)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(exam.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManagingSubjectsExam(exam)}
                        className="h-7 text-xs gap-1 font-normal"
                        aria-label={`${exam.title} derslerini yönet`}
                      >
                        <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        <span>{exam.subjects?.length || 0} Ders</span>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManagingClassroomsExam(exam)}
                        className="h-7 text-xs gap-1 font-normal"
                        aria-label={`${exam.title} sınıflarını yönet`}
                      >
                        <GraduationCap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        <span>{exam.classroomIds?.length || 0} Sınıf</span>
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => navigate(`/staff/exams/${exam.id}`)}
                          className="h-7 text-xs"
                        >
                          İncele / Sonuçlar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingExam(exam)}
                          disabled={isFinalized}
                          className="h-7 w-7 p-0"
                          aria-label={`${exam.title} sınavını düzenle`}
                        >
                          <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingExam(exam)}
                          disabled={isFinalized}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          aria-label={`${exam.title} sınavını sil`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        {data && data.totalElements > 0 ? (
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <div>
              Toplam <strong>{data.totalElements}</strong> sınav • Sayfa <strong>{page + 1}</strong> / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
                className="h-8 gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Önceki
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= totalPages || isLoading}
                className="h-8 gap-1"
              >
                Sonraki
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Dialogs */}
      <CreateExamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditExamDialog
        exam={editingExam}
        open={Boolean(editingExam)}
        onOpenChange={(open) => {
          if (!open) setEditingExam(null);
        }}
      />

      <DeleteExamDialog
        exam={deletingExam}
        open={Boolean(deletingExam)}
        onOpenChange={(open) => {
          if (!open) setDeletingExam(null);
        }}
      />

      <ExamSubjectsDialog
        exam={managingSubjectsExam}
        open={Boolean(managingSubjectsExam)}
        onOpenChange={(open) => {
          if (!open) setManagingSubjectsExam(null);
        }}
        onExamUpdated={(updated) => setManagingSubjectsExam(updated)}
      />

      <ExamClassroomsDialog
        exam={managingClassroomsExam}
        open={Boolean(managingClassroomsExam)}
        onOpenChange={(open) => {
          if (!open) setManagingClassroomsExam(null);
        }}
        onExamUpdated={(updated) => setManagingClassroomsExam(updated)}
      />
    </div>
  );
}

