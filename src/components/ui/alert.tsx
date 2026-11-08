import * as React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success';
  title?: string;
}

export function Alert({
  className,
  variant = 'default',
  title,
  children,
  ...props
}: AlertProps) {
  const Icon =
    variant === 'destructive' ? AlertCircle : variant === 'success' ? CheckCircle2 : Info;

  return (
    <div
      role={variant === 'destructive' ? 'alert' : 'status'}
      className={cn(
        'relative flex w-full items-start gap-3 rounded-lg border p-4 text-sm',
        variant === 'destructive' &&
          'border-destructive/50 bg-destructive/10 text-destructive',
        variant === 'success' && 'border-emerald-500/40 bg-emerald-50 text-emerald-900',
        variant === 'default' && 'bg-card text-card-foreground',
        className
      )}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        {title ? <p className="font-medium leading-none tracking-tight">{title}</p> : null}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

