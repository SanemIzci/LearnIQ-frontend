import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/uiSlice';
import {
  useAdminUsersQuery,
  usePatchUserMutation,
  useRegisterUserMutation,
  useResetPasswordMutation,
} from '../api/administrationApi';
import { UserRegisterDialog } from '../components/UserRegisterDialog';
import { UserEditDialog } from '../components/UserEditDialog';
import { UserResetPasswordDialog } from '../components/UserResetPasswordDialog';
import type { AdminUserSummary } from '@/types/api';
import type {
  PatchUserFormValues,
  RegisterUserFormValues,
} from '../schemas/userSchemas';

const PAGE_SIZE = 15;

export function UsersPage() {
  const dispatch = useAppDispatch();

  const [page, setPage] = React.useState(0);
  const [roleFilter, setRoleFilter] = React.useState<string>('');
  const [searchInput, setSearchInput] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  const [isRegisterOpen, setIsRegisterOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AdminUserSummary | null>(null);
  const [resettingUser, setResettingUser] = React.useState<AdminUserSummary | null>(null);

  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const {
    data: userListData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminUsersQuery({
    page,
    size: PAGE_SIZE,
    role: roleFilter || undefined,
    search: debouncedSearch || undefined,
  });

  const registerMutation = useRegisterUserMutation();
  const patchMutation = usePatchUserMutation();
  const resetPasswordMutation = useResetPasswordMutation();

  const users = userListData?.content || [];
  const totalElements = userListData?.totalElements || 0;
  const totalPages = Math.ceil(totalElements / PAGE_SIZE) || 1;

  const handleRegisterSubmit = async (values: RegisterUserFormValues) => {
    await registerMutation.mutateAsync(values);
    dispatch(
      pushToast({
        title: 'Kullanıcı Oluşturuldu',
        description: `"${values.fullName}" (${values.role}) başarıyla kaydedildi.`,
      })
    );
  };

  const handleEditSubmit = async (values: PatchUserFormValues) => {
    if (!editingUser) return;
    await patchMutation.mutateAsync({
      userId: editingUser.id,
      payload: values,
    });
    dispatch(
      pushToast({
        title: 'Kullanıcı Güncellendi',
        description: `"${editingUser.fullName}" bilgileri güncellendi.`,
      })
    );
  };

  const handleResetPasswordSubmit = async (newPassword: string) => {
    if (!resettingUser) return;
    await resetPasswordMutation.mutateAsync({
      userId: resettingUser.id,
      newPassword,
    });
    dispatch(
      pushToast({
        title: 'Şifre Sıfırlandı',
        description: `"${resettingUser.fullName}" hesabı için yeni şifre tanımlandı.`,
      })
    );
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default';
      case 'TEACHER':
        return 'secondary';
      case 'STUDENT':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Users className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Kurum Yönetimi
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Kullanıcı Hesap Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kurum bünyesindeki öğretmen, öğrenci ve yönetici hesaplarını yönetin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gap-1.5"
            aria-label="Kullanıcı listesini yenile"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span className="hidden sm:inline">Yenile</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsRegisterOpen(true)}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            <span>Yeni Kullanıcı Ekle</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Label htmlFor="user-search-input" className="sr-only">
                Kullanıcı Ara
              </Label>
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="user-search-input"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ad Soyad, kullanıcı adı veya e-posta ile arayın..."
                className="pl-9 pr-8 text-xs"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  aria-label="Aramayı temizle"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-44">
                <Label htmlFor="user-role-filter" className="sr-only">
                  Rol Filtresi
                </Label>
                <Select
                  id="user-role-filter"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(0);
                  }}
                  className="text-xs"
                >
                  <option value="">Tüm Roller (Hepsi)</option>
                  <option value="TEACHER">Yalnızca Öğretmenler</option>
                  <option value="STUDENT">Yalnızca Öğrenciler</option>
                  <option value="ADMIN">Yalnızca Yöneticiler</option>
                </Select>
              </div>

              <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Toplam <span className="font-mono font-semibold text-foreground">{totalElements}</span> hesap
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle as="h2" className="text-base font-semibold">
            Kullanıcı Listesi
          </CardTitle>
          <CardDescription className="text-xs">
            Kurum veritabanında kayıtlı kullanıcıların rolleri, durumları ve yönetim işlemleri.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              <span>Kullanıcı listesi yükleniyor...</span>
            </div>
          ) : isError ? (
            <div role="alert" className="space-y-3">
              <Alert variant="destructive" title="Kullanıcılar Yüklenemedi">
                {error instanceof Error ? error.message : 'Kullanıcı listesi alınırken bir hata oluştu.'}
              </Alert>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                Tekrar Dene
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              Arama kriterlerine uygun kullanıcı bulunamadı.
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <caption className="sr-only">Kurum kullanıcıları listesi</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Ad Soyad &amp; Kullanıcı Adı</TableHead>
                    <TableHead scope="col">E-Posta</TableHead>
                    <TableHead scope="col">Rol</TableHead>
                    <TableHead scope="col">Durum</TableHead>
                    <TableHead scope="col" className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-semibold text-foreground text-sm">
                          {user.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          @{user.username}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {user.email}
                      </TableCell>

                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="text-[11px] font-mono">
                          {user.role}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {user.active ? (
                          <Badge variant="success" className="text-[11px]">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[11px]">
                            Pasif
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                            className="h-8 text-xs gap-1"
                            aria-label={`${user.fullName} kullanıcısını düzenle`}
                          >
                            <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">Düzenle</span>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setResettingUser(user)}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                            aria-label={`${user.fullName} şifresini sıfırla`}
                          >
                            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">Şifre Sıfırla</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Navigation */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
              <div>
                Sayfa <span className="font-semibold text-foreground">{page + 1}</span> / {totalPages}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isLoading}
                  className="h-8 text-xs gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Önceki
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || isLoading}
                  className="h-8 text-xs gap-1"
                >
                  Sonraki
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Modals */}
      <UserRegisterDialog
        open={isRegisterOpen}
        onOpenChange={setIsRegisterOpen}
        onSubmit={handleRegisterSubmit}
      />

      <UserEditDialog
        open={Boolean(editingUser)}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
        user={editingUser}
        onSubmit={handleEditSubmit}
      />

      <UserResetPasswordDialog
        open={Boolean(resettingUser)}
        onOpenChange={(open) => {
          if (!open) setResettingUser(null);
        }}
        user={resettingUser}
        onSubmit={handleResetPasswordSubmit}
      />
    </div>
  );
}
