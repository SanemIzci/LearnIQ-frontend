import * as React from 'react';
import { ChevronLeft, ChevronRight, KeyRound, Loader2, Plus, Search, ShieldCheck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import { useGlobalUsersQuery } from '../api/platformApi';
import { CreateGlobalUserDialog } from '../components/CreateGlobalUserDialog';
import { ResetPasswordDialog } from '../components/ResetPasswordDialog';
import type { GlobalUserSummary } from '@/types/api';

export function GlobalAdminsPage() {
  const [searchInput, setSearchInput] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [page, setPage] = React.useState(0);
  const pageSize = 15;

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [selectedResetUser, setSelectedResetUser] = React.useState<GlobalUserSummary | null>(null);

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

  const { data, isLoading, error } = useGlobalUsersQuery({
    search: debouncedSearch || undefined,
    page,
    size: pageSize,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.totalElements / pageSize)) : 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Platform Yöneticileri (SUPER_ADMIN)
            </h1>
            {data ? (
              <Badge variant="secondary" className="font-mono">
                {data.totalElements} Yönetici
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            LearnIQ merkezi sistem yöneticileri (`public.global_users`). Bu hesaplar tüm platforma tam yetkilidir.
          </p>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Yeni Yönetici Ekle
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center rounded-lg border bg-card p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Yönetici kullanıcı adı veya e-postaya göre ara..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            aria-label="Yönetici Ara"
          />
        </div>
      </div>

      {/* Error state */}
      {error ? (
        <Alert variant="destructive" title="Yükleme Hatası">
          Platform yöneticileri listelenirken bir hata oluştu.
        </Alert>
      ) : null}

      {/* Global Users Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kullanıcı Adı</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Yetki / Rol</TableHead>
              <TableHead>Oluşturulma Tarihi</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Yöneticiler yükleniyor...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? null : !data || data.content.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <ShieldCheck className="mx-auto mb-2 h-8 w-8 opacity-40" aria-hidden="true" />
                  Kayıtlı yönetici hesabı bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              data.content.map((admin) => (
                <TableRow key={String(admin.id)}>
                  <TableCell className="font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span>{admin.username}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{admin.email}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="text-[11px]">
                      SUPER_ADMIN
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(admin.createdAt).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedResetUser(admin)}
                      className="h-7 text-xs gap-1"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      Şifre Sıfırla
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        {data && data.totalElements > 0 ? (
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <div>
              Toplam <strong>{data.totalElements}</strong> yönetici • Sayfa <strong>{page + 1}</strong> / {totalPages}
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

      {/* Modals */}
      <CreateGlobalUserDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <ResetPasswordDialog
        user={selectedResetUser}
        open={Boolean(selectedResetUser)}
        onOpenChange={(open) => {
          if (!open) setSelectedResetUser(null);
        }}
      />
    </div>
  );
}

