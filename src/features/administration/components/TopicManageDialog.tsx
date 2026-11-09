import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import {
  useCreateTopicMutation,
  useDeleteTopicMutation,
  useSubjectTopicsQuery,
} from '../api/administrationApi';
import {
  createSubjectTopicSchema,
  type CreateSubjectTopicFormValues,
} from '../schemas/subjectSchemas';
import type { SubjectResponse } from '@/types/api';

export interface TopicManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: SubjectResponse | null;
}

export function TopicManageDialog({
  open,
  onOpenChange,
  subject,
}: TopicManageDialogProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const subjectId = subject?.id;
  const topicsQuery = useSubjectTopicsQuery(subjectId);
  const createTopicMutation = useCreateTopicMutation(subjectId || '');
  const deleteTopicMutation = useDeleteTopicMutation(subjectId || '');

  const topics = topicsQuery.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSubjectTopicFormValues>({
    resolver: zodResolver(createSubjectTopicSchema),
    defaultValues: {
      name: '',
      code: '',
      orderIndex: 0,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: '',
        code: '',
        orderIndex: topics.length,
      });
      setServerError(null);
    }
  }, [open, topics.length, reset]);

  if (!subject) return null;

  const handleCreateTopic = async (data: CreateSubjectTopicFormValues) => {
    setServerError(null);
    try {
      await createTopicMutation.mutateAsync({
        name: data.name,
        code: data.code || undefined,
        orderIndex: Number(data.orderIndex) || 0,
      });
      reset({
        name: '',
        code: '',
        orderIndex: topics.length + 1,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Konu eklenemedi.');
      } else {
        setServerError('Konu eklenirken bir hata oluştu.');
      }
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    setServerError(null);
    try {
      await deleteTopicMutation.mutateAsync(topicId);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Konu silinemedi.');
      } else {
        setServerError('Konu silinirken bir hata oluştu.');
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) {
          onOpenChange(nextOpen);
        }
      }}
      title={`${subject.name} — Konu Müfredatı Yönetimi`}
      description="Bu derse ait kazanım ve konu başlıklarını yönetin."
      className="max-w-xl"
    >
      <div className="space-y-4">
        {serverError ? (
          <div role="alert" aria-live="polite">
            <Alert variant="destructive" title="İşlem Hatası">
              {serverError}
            </Alert>
          </div>
        ) : null}

        {/* Add New Topic Form */}
        <form
          onSubmit={handleSubmit(handleCreateTopic)}
          method="post"
          noValidate
          className="rounded-lg border bg-muted/20 p-3 space-y-3"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Yeni Konu Başlığı Ekle</span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
            <div className="sm:col-span-3 space-y-1">
              <Label htmlFor="topic-name" className="text-xs">
                Konu Adı <span className="text-destructive">*</span>
              </Label>
              <Input
                id="topic-name"
                disabled={isSubmitting || createTopicMutation.isPending}
                placeholder="Örn: Türev, Paragrafta Anlam, Basınç"
                className="h-8 text-xs"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'topic-name-error' : undefined}
                {...register('name')}
              />
              {errors.name ? (
                <p id="topic-name-error" role="alert" className="text-[11px] text-destructive">
                  {errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="topic-code" className="text-xs">
                Konu Kodu <span className="text-muted-foreground font-normal">(Opsiyonel)</span>
              </Label>
              <Input
                id="topic-code"
                disabled={isSubmitting || createTopicMutation.isPending}
                placeholder="Örn: MAT-01"
                className="h-8 text-xs font-mono uppercase"
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? 'topic-code-error' : undefined}
                {...register('code')}
              />
              {errors.code ? (
                <p id="topic-code-error" role="alert" className="text-[11px] text-destructive">
                  {errors.code.message}
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-1 space-y-1">
              <Label htmlFor="topic-order" className="text-xs">
                Sıra No
              </Label>
              <Input
                id="topic-order"
                type="number"
                disabled={isSubmitting || createTopicMutation.isPending}
                className="h-8 text-xs font-mono"
                aria-invalid={Boolean(errors.orderIndex)}
                aria-describedby={errors.orderIndex ? 'topic-order-error' : undefined}
                {...register('orderIndex')}
              />
              {errors.orderIndex ? (
                <p id="topic-order-error" role="alert" className="text-[11px] text-destructive">
                  {errors.orderIndex.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || createTopicMutation.isPending}
              className="h-8 text-xs gap-1"
            >
              {createTopicMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Konuyu Ekle</span>
            </Button>
          </div>
        </form>

        {/* Existing Topics List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Tanımlı Konular ({topics.length})</span>
            {topicsQuery.isFetching ? (
              <span className="flex items-center gap-1 text-[11px] font-normal">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Yenileniyor...
              </span>
            ) : null}
          </div>

          {topicsQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              <span>Konular yükleniyor...</span>
            </div>
          ) : topics.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
              Bu derse ait henüz bir konu başlığı tanımlanmamış.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {topics
                .slice()
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((topic, idx) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between rounded-md border bg-card p-2 text-xs hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] h-5 px-1.5">
                        #{topic.orderIndex ?? idx + 1}
                      </Badge>
                      <span className="font-medium text-foreground">{topic.name}</span>
                      {topic.code ? (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({topic.code})
                        </span>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTopic(topic.id)}
                      disabled={deleteTopicMutation.isPending}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      aria-label={`${topic.name} konusunu sil`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
