import * as React from 'react';
import { Database, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import { useRagBackfillMutation } from '../api/aiRagApi';
import type { RagBackfillResponse } from '@/types/api';

export function RagBackfillCard() {
  const [batchSize, setBatchSize] = React.useState<number>(50);
  const [lastResult, setLastResult] = React.useState<RagBackfillResponse | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const backfillMutation = useRagBackfillMutation();

  const handleTriggerBackfill = async () => {
    setErrorMessage(null);
    try {
      const res = await backfillMutation.mutateAsync(batchSize);
      setLastResult(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('RAG backfill işlemi başlatılırken hata oluştu.');
      }
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" aria-hidden="true" />
          <CardTitle as="h2" className="text-base">
            RAG Doküman İndeksleme &amp; Vektör Senkronizasyonu (Backfill)
          </CardTitle>
        </div>
        <CardDescription>
          Öğrenci sınav sonuçları, ders kuralları ve öğretmen gözlemlerinin semantik vektör
          indekslerini güncelleyin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <div role="alert">
            <Alert variant="destructive" title="Backfill Hatası">
              {errorMessage}
            </Alert>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-48 space-y-1">
            <Label htmlFor="backfill-batch-size" className="text-xs">
              Paket Boyutu (Batch Size)
            </Label>
            <Select
              id="backfill-batch-size"
              value={String(batchSize)}
              onChange={(e) => setBatchSize(Number(e.target.value) || 50)}
              disabled={backfillMutation.isPending}
            >
              <option value="25">25 Doküman</option>
              <option value="50">50 Doküman (Önerilen)</option>
              <option value="100">100 Doküman</option>
            </Select>
          </div>

          <Button
            type="button"
            onClick={handleTriggerBackfill}
            disabled={backfillMutation.isPending}
            className="gap-1.5"
          >
            {backfillMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Vektör İndekslemeyi Başlat
          </Button>
        </div>

        {lastResult ? (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
              <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span>Son İndeksleme Özeti:</span>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded bg-card p-2 border">
                <dt className="text-muted-foreground text-[11px]">Aday Doküman</dt>
                <dd className="font-mono font-bold text-sm">{lastResult.candidates}</dd>
              </div>
              <div className="rounded bg-card p-2 border">
                <dt className="text-muted-foreground text-[11px]">Güncellenen</dt>
                <dd className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {lastResult.updated}
                </dd>
              </div>
              <div className="rounded bg-card p-2 border">
                <dt className="text-muted-foreground text-[11px]">Başarısız</dt>
                <dd className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                  {lastResult.failed}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
