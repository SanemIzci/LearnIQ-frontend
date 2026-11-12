import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  BookPlus,
  Calculator,
  ListOrdered,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/uiSlice';
import {
  useAdministrationSubjectsQuery,
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useUpdateSubjectMutation,
} from '../api/administrationApi';
import { SubjectCreateDialog } from '../components/SubjectCreateDialog';
import { SubjectEditDialog } from '../components/SubjectEditDialog';
import { SubjectDeleteDialog } from '../components/SubjectDeleteDialog';
import { TopicManageDialog } from '../components/TopicManageDialog';
import type { SubjectResponse } from '@/types/api';
import type { SubjectFormValues } from '../schemas/subjectSchemas';

export function SubjectsPage() {
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedSubjectForEdit, setSelectedSubjectForEdit] = React.useState<SubjectResponse | null>(null);
  const [selectedSubjectForDelete, setSelectedSubjectForDelete] = React.useState<SubjectResponse | null>(null);
  const [selectedSubjectForTopics, setSelectedSubjectForTopics] = React.useState<SubjectResponse | null>(null);

  const {
    data: subjects = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdministrationSubjectsQuery();

  const createSubjectMutation = useCreateSubjectMutation();
  const updateSubjectMutation = useUpdateSubjectMutation();
  const deleteSubjectMutation = useDeleteSubjectMutation();

  const filteredSubjects = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return subjects;
    return subjects.filter((s) => s.name.toLowerCase().includes(term));
  }, [subjects, searchTerm]);

  const handleCreateSubmit = async (values: SubjectFormValues) => {
    await createSubjectMutation.mutateAsync(values);
    dispatch(
      pushToast({
        title: 'Ders Eklendi',
        description: `"${values.name}" dersi başarıyla tanımlandı.`,
      })
    );
  };

  const handleUpdateSubmit = async (values: SubjectFormValues) => {
    if (!selectedSubjectForEdit) return;
    await updateSubjectMutation.mutateAsync({
      subjectId: selectedSubjectForEdit.id,
      payload: values,
    });
    dispatch(
      pushToast({
        title: 'Ders Güncellendi',
        description: `"${values.name}" dersi başarıyla güncellendi.`,
      })
    );
  };

  const handleDeleteConfirm = async (subjectId: string) => {
    const subjectName = selectedSubjectForDelete?.name ?? 'Ders';
    await deleteSubjectMutation.mutateAsync(subjectId);
    dispatch(
      pushToast({
        title: 'Ders Silindi',
        description: `"${subjectName}" başarıyla silindi.`,
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Müfredat ve Akademik Yapı
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Ders ve Konu Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sınavlarda değerlendirilecek dersleri ve alt kazanım/konu başlıklarını tanımlayın.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/staff/exam-rules"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Net Kuralları Merkezi</span>
          </Link>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gap-1.5"
            aria-label="Ders listesini yenile"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span className="hidden sm:inline">Yenile</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5"
          >
            <BookPlus className="h-4 w-4" aria-hidden="true" />
            <span>Yeni Ders Ekle</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Label htmlFor="subject-search-input" className="sr-only">
              Ders Ara
            </Label>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="subject-search-input"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ders adına göre filtreleyin..."
              className="pl-9 pr-8 text-xs"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label="Aramayı temizle"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Subjects Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle as="h2" className="text-base font-semibold">
                Tanımlı Dersler ({filteredSubjects.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Kurumunuzda aktif olarak kullanılan tüm akademik dersler.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              <span>Ders listesi yükleniyor...</span>
            </div>
          ) : isError ? (
            <div role="alert" className="space-y-3">
              <Alert variant="destructive" title="Dersler Yüklenemedi">
                {error instanceof Error ? error.message : 'Ders listesi alınırken bir hata oluştu.'}
              </Alert>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                Tekrar Dene
              </Button>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              {searchTerm
                ? 'Arama kriterine uygun ders bulunamadı.'
                : 'Kurumunuzda henüz bir ders tanımlanmamış. "Yeni Ders Ekle" butonunu kullanarak ilk dersinizi oluşturun.'}
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <caption className="sr-only">Tanımlı dersler listesi</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Ders Adı</TableHead>
                    <TableHead scope="col">Durum</TableHead>
                    <TableHead scope="col" className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                          <BookOpen className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                          <span>{subject.name}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-[11px]">
                          Aktif Müfredat
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSubjectForTopics(subject)}
                            className="h-8 text-xs gap-1"
                            aria-label={`${subject.name} konularını yönet`}
                          >
                            <ListOrdered className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            <span>Konuları Yönet</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSubjectForEdit(subject)}
                            className="h-8 text-xs gap-1"
                            aria-label={`${subject.name} dersini düzenle`}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                            <span>Düzenle</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSubjectForDelete(subject)}
                            className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                            aria-label={`${subject.name} dersini sil`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                            <span>Sil</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <SubjectCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateSubmit}
      />

      <SubjectEditDialog
        open={Boolean(selectedSubjectForEdit)}
        onOpenChange={(open) => {
          if (!open) setSelectedSubjectForEdit(null);
        }}
        subject={selectedSubjectForEdit}
        onSubmit={handleUpdateSubmit}
      />

      <SubjectDeleteDialog
        open={Boolean(selectedSubjectForDelete)}
        onOpenChange={(open) => {
          if (!open) setSelectedSubjectForDelete(null);
        }}
        subject={selectedSubjectForDelete}
        onConfirm={handleDeleteConfirm}
      />

      <TopicManageDialog
        open={Boolean(selectedSubjectForTopics)}
        onOpenChange={(open) => {
          if (!open) setSelectedSubjectForTopics(null);
        }}
        subject={selectedSubjectForTopics}
      />
    </div>
  );
}
