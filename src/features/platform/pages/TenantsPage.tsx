import * as React from 'react';
import { Building2, ChevronLeft, ChevronRight, Loader2, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import { useTenantsQuery } from '../api/platformApi';
import { CreateTenantDialog } from '../components/CreateTenantDialog';
import { TenantDetailDialog } from '../components/TenantDetailDialog';
import { UpdateSubscriptionDialog } from '../components/UpdateSubscriptionDialog';
import type { TenantSubscriptionStatus, TenantSummary } from '@/types/api';

function getStatusBadge(status: TenantSubscriptionStatus) {
  switch (status) {
    case 'ACTIVE':
      return (
        <Badge
          variant="secondary"
          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
        >
          Aktif
        </Badge>
      );
    case 'SUSPENDED':
      return <Badge variant="destructive">Askıya Alındı</Badge>;
    case 'EXPIRED':
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
          Süresi Doldu
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function TenantsPage() {
  const [searchInput, setSearchInput] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<TenantSubscriptionStatus | ''>('');
  const [page, setPage] = React.useState(0);
  const pageSize = 15;

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [selectedDetailId, setSelectedDetailId] = React.useState<string | null>(null);
  const [selectedSubscriptionTenant, setSelectedSubscriptionTenant] =
    React.useState<TenantSummary | null>(null);

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

  const { data, isLoading, error } = useTenantsQuery({
    search: debouncedSearch || undefined,
    status: statusFilter ? statusFilter : undefined,
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
              Kurum (Tenant) Yönetimi
            </h1>
            {data ? (
              <Badge variant="secondary" className="font-mono">
                {data.totalElements} Kurum
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Platformdaki okulların veritabanı şemaları, abonelik durumları ve provisioning işlemleri.
          </p>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Yeni Kurum Ekle
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Kurum adı veya şema koduna göre ara..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            aria-label="Kurum Ara"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as TenantSubscriptionStatus | '');
              setPage(0);
            }}
            aria-label="Abonelik Durumu Filtresi"
          >
            <option value="">Tüm Durumlar</option>
            <option value="ACTIVE">Aktif</option>
            <option value="SUSPENDED">Askıya Alındı</option>
            <option value="EXPIRED">Süresi Doldu</option>
          </Select>
        </div>
      </div>

      {/* Error state */}
      {error ? (
        <Alert variant="destructive" title="Yükleme Hatası">
          Kurum listesi yüklenirken bir sorun oluştu. Lütfen bağlantınızı kontrol edin.
        </Alert>
      ) : null}

      {/* Tenants Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Şema Kodu (ID)</TableHead>
              <TableHead>Kurum Adı</TableHead>
              <TableHead>Alan Adı (Domain)</TableHead>
              <TableHead>Abonelik Durumu</TableHead>
              <TableHead>Kayıt Tarihi</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Kurumlar yükleniyor...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? null : !data || data.content.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <Building2 className="mx-auto mb-2 h-8 w-8 opacity-40" aria-hidden="true" />
                  Kayıtlı kurum bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              data.content.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    {tenant.id}
                  </TableCell>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {tenant.domain || '—'}
                  </TableCell>
                  <TableCell>{getStatusBadge(tenant.subscriptionStatus)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(tenant.createdAt).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDetailId(tenant.id)}
                        className="h-7 text-xs"
                      >
                        Detay
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSubscriptionTenant(tenant)}
                        className="h-7 text-xs"
                      >
                        Abonelik
                      </Button>
                    </div>
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
              Toplam <strong>{data.totalElements}</strong> kurum • Sayfa <strong>{page + 1}</strong> / {totalPages}
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
      <CreateTenantDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <TenantDetailDialog
        tenantId={selectedDetailId}
        open={Boolean(selectedDetailId)}
        onOpenChange={(open) => {
          if (!open) setSelectedDetailId(null);
        }}
      />
      <UpdateSubscriptionDialog
        tenant={selectedSubscriptionTenant}
        open={Boolean(selectedSubscriptionTenant)}
        onOpenChange={(open) => {
          if (!open) setSelectedSubscriptionTenant(null);
        }}
      />
    </div>
  );
}
