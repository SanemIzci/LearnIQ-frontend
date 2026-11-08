import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { tenantQueryKey } from '@/lib/api/queryClient';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/uiSlice';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import { platformApi } from '../api/platformApi';
import {
  updateSubscriptionSchema,
  type UpdateSubscriptionFormValues,
} from '../schemas/platformSchemas';
import type { TenantSummary } from '@/types/api';

export interface UpdateSubscriptionDialogProps {
  tenant: TenantSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateSubscriptionDialog({
  tenant,
  open,
  onOpenChange,
}: UpdateSubscriptionDialogProps) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateSubscriptionFormValues>({
    resolver: zodResolver(updateSubscriptionSchema),
    defaultValues: {
      status: tenant?.subscriptionStatus ?? 'ACTIVE',
    },
  });

  React.useEffect(() => {
    if (tenant && open) {
      reset({ status: tenant.subscriptionStatus });
      setServerError(null);
    }
  }, [tenant, open, reset]);

  if (!tenant) return null;

  const onSubmit = async (data: UpdateSubscriptionFormValues) => {
    setServerError(null);
    try {
      await platformApi.updateSubscription(tenant.id, data.status);
      await queryClient.invalidateQueries({
        queryKey: tenantQueryKey(null, 'tenants'),
      });
      dispatch(
        pushToast({
          title: 'Abonelik Güncellendi',
          description: `${tenant.name} kurumu abonelik durumu "${data.status}" olarak güncellendi.`,
        })
      );
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setServerError('Kurum bulunamadı.');
        } else if (err.message) {
          setServerError(err.message);
        } else {
          setServerError('Abonelik durumu güncellenirken hata oluştu.');
        }
      } else {
        setServerError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Abonelik Durumu Güncelle"
      description={`${tenant.name} (${tenant.id}) için abonelik durumunu belirleyin.`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError ? (
          <Alert variant="destructive" title="İşlem Başarısız">
            {serverError}
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="subscription-status">Abonelik Durumu</Label>
          <Select id="subscription-status" {...register('status')}>
            <option value="ACTIVE">ACTIVE (Aktif — Sisteme tam erişim)</option>
            <option value="SUSPENDED">
              SUSPENDED (Askıya Alındı — Kullanıcı girişi engellenir)
            </option>
            <option value="EXPIRED">EXPIRED (Süresi Doldu — Yenileme beklenir)</option>
          </Select>
          {errors.status ? (
            <p className="text-xs text-destructive">{errors.status.message}</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Vazgeç
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Güncelle'
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

