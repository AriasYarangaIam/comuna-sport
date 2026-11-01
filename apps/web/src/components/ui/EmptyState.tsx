import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-headline-sm text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-pretty text-small text-ink-soft">
        {description}
      </p>
      {action !== undefined ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
