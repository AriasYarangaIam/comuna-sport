import type { ReactNode } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import type { ErrorTone } from '../../lib/errors';

export type AlertTone = ErrorTone | 'success';

const toneStyles: Record<
  AlertTone,
  { container: string; icon: string; Icon: LucideIcon }
> = {
  info: {
    container: 'border-sky-200 bg-info-bg text-info-text',
    icon: 'text-sky-700',
    Icon: Info,
  },
  success: {
    container: 'border-[#bfe9dc] bg-success-bg text-success-text',
    icon: 'text-success-text',
    Icon: CheckCircle2,
  },
  warning: {
    container: 'border-[#f5d9ad] bg-warning-bg text-warning-text',
    icon: 'text-warning-text',
    Icon: TriangleAlert,
  },
  danger: {
    container: 'border-[#f5c6c1] bg-danger-bg text-danger-text',
    icon: 'text-danger-text',
    Icon: CircleAlert,
  },
};

export interface InlineAlertProps {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  live?: 'alert' | 'status' | 'off';
  className?: string;
}

export function InlineAlert({
  tone = 'info',
  title,
  children,
  action,
  live,
  className,
}: InlineAlertProps) {
  const styles = toneStyles[tone];
  const role =
    live === 'off'
      ? undefined
      : live ?? (tone === 'danger' ? 'alert' : 'status');

  return (
    <div
      role={role}
      aria-live={role === undefined ? undefined : role === 'alert' ? 'assertive' : 'polite'}
      className={cn(
        'flex gap-3 rounded-card border p-4 text-small',
        styles.container,
        className,
      )}
    >
      <styles.Icon
        className={cn('mt-0.5 h-5 w-5 shrink-0', styles.icon)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children !== undefined ? (
          <div className="mt-1 text-pretty opacity-90">{children}</div>
        ) : null}
        {action !== undefined ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
