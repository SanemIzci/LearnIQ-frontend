import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Loader2, Tag, X } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import {
  observationSchema,
  type ObservationFormValues,
} from '../schemas/observationSchemas';
import type { ObservationResponse, SubjectResponse } from '@/types/api';

export interface ObservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classroomId: string;
  classroomName: string;
  subjects: SubjectResponse[];
  editingObservation?: ObservationResponse | null;
  onSave: (payload: ObservationFormValues) => Promise<void>;
}

export function ObservationDialog({
  open,
  onOpenChange,
  classroomName,
  subjects,
  editingObservation,
  onSave,
}: ObservationDialogProps) {
  const [tagInput, setTagInput] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ObservationFormValues>({
    resolver: zodResolver(observationSchema),
    mode: 'onBlur',
    defaultValues: {
      content: '',
      subjectId: '',
      examId: '',
      tags: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      if (editingObservation) {
        reset({
          content: editingObservation.content,
          subjectId: editingObservation.subjectId || '',
          examId: editingObservation.examId || '',
          tags: Array.isArray(editingObservation.tags) ? editingObservation.tags : [],
        });
        setTags(Array.isArray(editingObservation.tags) ? editingObservation.tags : []);
      } else {
        reset({
          content: '',
          subjectId: '',
          examId: '',
          tags: [],
        });
        setTags([]);
      }
      setTagInput('');
      setServerError(null);
    }
  }, [open, editingObservation, reset]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      const nextTags = [...tags, trimmed];
      setTags(nextTags);
      setValue('tags', nextTags, { shouldValidate: true });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    setValue('tags', nextTags, { shouldValidate: true });
  };

  const onSubmit = async (data: ObservationFormValues) => {
    setServerError(null);
    try {
      await onSave({
        ...data,
        tags,
      });
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Gözlem notu kaydedilirken bir hata oluştu.');
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSubmitting) return;
        onOpenChange(nextOpen);
      }}
      title={editingObservation ? 'Gözlem Notunu Düzenle' : 'Yeni Öğretmen Gözlem Notu Ekle'}
      description={`${classroomName} sınıfı için pedagojik veya akademik gözlem kaydı.`}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} method="post" noValidate className="space-y-4">
        {serverError ? (
          <div role="alert" aria-live="polite">
            <Alert variant="destructive" title="Kayıt Başarısız">
              {serverError}
            </Alert>
          </div>
        ) : null}

        {/* Content Field */}
        <div className="space-y-1.5">
          <Label htmlFor="observation-content">
            Gözlem İçeriği <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="observation-content"
            rows={4}
            disabled={isSubmitting}
            placeholder="Öğrencinin veya sınıfın derse katılımı, odaklanma durumu veya gelişim ihtiyaçları hakkında detaylı notunuzu yazınız (en az 10 karakter)..."
            aria-invalid={Boolean(errors.content)}
            aria-describedby={errors.content ? 'observation-content-error' : undefined}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            {...register('content')}
          />
          {errors.content ? (
            <p id="observation-content-error" role="alert" className="text-xs text-destructive">
              {errors.content.message}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">10 - 5000 karakter arası</p>
          )}
        </div>

        {/* Subject Filter (Optional) */}
        <div className="space-y-1.5">
          <Label htmlFor="observation-subject">İlgili Ders (Opsiyonel)</Label>
          <Select id="observation-subject" disabled={isSubmitting} {...register('subjectId')}>
            <option value="">Genel Sınıf Gözlemi (Derse Özel Değil)</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Tags management */}
        <div className="space-y-2">
          <Label htmlFor="observation-tag-input">Etiketler (Opsiyonel)</Label>
          <div className="flex gap-2">
            <Input
              id="observation-tag-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              disabled={isSubmitting}
              placeholder="Örn: motivasyon, dikkat, geometri..."
              className="text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTag}
              disabled={isSubmitting || !tagInput.trim()}
            >
              <Tag className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              Ekle
            </Button>
          </div>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 text-xs py-0.5 px-2 bg-muted/60"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    disabled={isSubmitting}
                    className="hover:text-destructive focus:outline-none"
                    aria-label={`"${tag}" etiketini kaldır`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            İptal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-1.5">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="h-4 w-4" aria-hidden="true" />
            )}
            {editingObservation ? 'Güncellemeleri Kaydet' : 'Gözlemi Kaydet'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

