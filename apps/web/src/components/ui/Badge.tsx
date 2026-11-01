import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

export type BadgeTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'active'
  | 'inactive';

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-border bg-tint text-ink-soft',
  info: 'border-sky-200 bg-info-bg text-info-text',
  success: 'border-[#bfe9dc] bg-success-bg text-success-text',
  warning: 'border-[#f5d9ad] bg-warning-bg text-warning-text',
  danger: 'border-[#f5c6c1] bg-danger-bg text-danger-text',
  active: 'border-[#bfe9dc] bg-success-bg text-success-text',
  inactive: 'border-border bg-tint text-ink-soft',
};

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function Badge({
  tone = 'neutral',
  icon: Icon,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-caption font-medium leading-none',
        toneClasses[tone],
        className,
      )}
    >
      {Icon !== undefined ? (
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      ) : null}
      <span>{children}</span>
    </span>
  );
}
