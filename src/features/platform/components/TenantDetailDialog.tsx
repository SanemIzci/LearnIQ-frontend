import { Calendar, Globe, Loader2, Users } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTenantDetailQuery } from '../api/platformApi';
import type { TenantSubscriptionStatus } from '@/types/api';

export interface TenantDetailDialogProps {
  tenantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getStatusBadge(status: TenantSubscriptionStatus) {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Aktif</Badge>;
    case 'SUSPENDED':
      return <Badge variant="destructive">Askıya Alındı</Badge>;
    case 'EXPIRED':
      return <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">Süresi Doldu</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function TenantDetailDialog({
  tenantId,
  open,
  onOpenChange,
}: TenantDetailDialogProps) {
  const { data: tenant, isLoading, error } = useTenantDetailQuery(open ? tenantId : null);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Kurum Detayı"
      description="Veritabanı şeması ve kurum genel metrikleri."
    >
      {isLoading ? (
        <div className="flex h-36 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error || !tenant ? (
        <p className="py-4 text-sm text-destructive" role="alert">Kurum bilgileri yüklenemedi.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground">{tenant.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">Şema: {tenant.id}</p>
            </div>
            {getStatusBadge(tenant.subscriptionStatus)}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Özel Alan Adı</span>
              </div>
              <p className="font-medium">{tenant.domain || 'Tanımlanmamış'}</p>
            </div>

            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Kullanıcı Sayısı</span>
              </div>
              <p className="text-lg font-bold text-primary">{tenant.userCount}</p>
            </div>

            <div className="rounded-lg border p-3 bg-muted/30 col-span-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Oluşturulma Tarihi</span>
              </div>
              <p className="font-medium">
                {new Date(tenant.createdAt).toLocaleString('tr-TR', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => onOpenChange(false)}>
              Kapat
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
