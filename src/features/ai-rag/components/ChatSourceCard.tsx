import * as React from 'react';
import { ChevronDown, ChevronRight, Database, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ChatSource } from '@/types/api';

export interface ChatSourceCardProps {
  sources: ChatSource[];
}

export function ChatSourceCard({ sources }: ChatSourceCardProps) {
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-muted-foreground">
        <Database className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span>RAG Bilgi Bankası Kaynakları &amp; Atıflar ({sources.length}):</span>
      </div>

      <div className="space-y-1.5">
        {sources.map((source, idx) => {
          const isExpanded = expandedIndex === idx;
          const similarityScore = (Number(source.similarity) * 100).toFixed(1);

          return (
            <div
              key={`${source.sourceId}-${idx}`}
              className="rounded-md border bg-muted/20 p-2 text-xs transition-colors hover:bg-muted/40"
            >
              <button
                type="button"
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                aria-expanded={isExpanded}
                className="flex w-full items-center justify-between gap-2 text-left focus:outline-none"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                  <span className="font-semibold text-foreground truncate max-w-[220px] sm:max-w-xs">
                    Kaynak #{idx + 1}: {source.sourceType}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Benzerlik: %{similarityScore}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                )}
              </button>

              {isExpanded && source.metadata ? (
                <div className="mt-2 rounded bg-card p-2 text-[11px] font-mono border">
                  <pre className="whitespace-pre-wrap break-all text-muted-foreground overflow-x-auto">
                    {JSON.stringify(source.metadata, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

