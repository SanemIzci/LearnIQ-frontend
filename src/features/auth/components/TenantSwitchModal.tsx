import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { switchTenant } from '@/store/authSlice';
import { logoutSession } from '@/lib/api/client';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { tenantSwitchSchema, type TenantSwitchFormValues } from '../schemas/authSchemas';

export interface TenantSwitchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTenantId?: string | null;
}

export function TenantSwitchModal({
  open,
  onOpenChange,
  currentTenantId,
}: TenantSwitchModalProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TenantSwitchFormValues>({
    resolver: zodResolver(tenantSwitchSchema),
    defaultValues: {
      tenantId: currentTenantId ?? '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({ tenantId: currentTenantId ?? '' });
    }
  }, [open, currentTenantId, reset]);

  const onSubmit = async (data: TenantSwitchFormValues) => {
    const nextTenant = data.tenantId.trim();
    if (nextTenant === currentTenantId) {
      onOpenChange(false);
      return;
    }

    // Revoke previous tenant's server-side refresh token and clear old session state (F3)
    await logoutSession();
    // Establish new tenant context, bump sessionEpoch, purge query cache, and set isInitialized: true
    dispatch(switchTenant(nextTenant));

    onOpenChange(false);
    navigate(`/login?tenant=${encodeURIComponent(nextTenant)}&reason=switched`, { replace: true });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Kurum (Tenant) Değiştir"
      description="Farklı bir kurum şemasına geçiş yapmak üzeresiniz. Güvenlik ve veri izolasyonu gereği mevcut kurum oturumunuz kapatılacak ve önbellek temizlenecektir."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="switch-tenant-id">Yeni Kurum (Tenant) Kodu</Label>
          <div className="relative">
            <Building2
              className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="switch-tenant-id"
              className="pl-9"
              placeholder="ornek: izmir_fen_lisesi"
              aria-invalid={errors.tenantId ? 'true' : 'false'}
              aria-describedby={errors.tenantId ? 'switch-tenant-error' : undefined}
              {...register('tenantId')}
            />
          </div>
          {errors.tenantId ? (
            <p id="switch-tenant-error" className="text-xs text-destructive">
              {errors.tenantId.message}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Vazgeç
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Kurumu Değiştir
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

