import { Check, X } from 'lucide-react';
import type { IncidentStateType } from '../../types/api';
import { cn } from '../../lib/cn';

interface TimelineNode {
  state: IncidentStateType;
  label: string;
  hint: string;
}

const standardNodes: readonly TimelineNode[] = [
  {
    state: 'UNDER_REVIEW',
    label: 'En revisión',
    hint: 'El municipio recibe y evalúa el reporte.',
  },
  {
    state: 'APPROVED',
    label: 'Aprobado',
    hint: 'Se autoriza la intervención de mantenimiento.',
  },
  {
    state: 'RESOLVED',
    label: 'Resuelto',
    hint: 'El daño fue atendido y cerrado.',
  },
];

const rejectedNode: TimelineNode = {
  state: 'REJECTED',
  label: 'Rechazado (cerrado)',
  hint: 'El reporte fue desestimado; no admite más cambios.',
};

const order: Record<IncidentStateType, number> = {
  UNDER_REVIEW: 0,
  APPROVED: 1,
  RESOLVED: 2,
  REJECTED: 0,
};

export interface IncidentTimelineProps {
  state: IncidentStateType;
  createdAt?: string;
  resolvedAt?: string | null;
  compact?: boolean;
}

export function IncidentTimeline({
  state,
  createdAt,
  resolvedAt,
  compact = false,
}: IncidentTimelineProps) {
  const nodes =
    state === 'REJECTED' ? [standardNodes[0]!, rejectedNode] : [...standardNodes];
  const currentIndex =
    state === 'REJECTED' ? 1 : order[state];

  return (
    <div>
      <ol className="space-y-0">
        {nodes.map((node, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex;
          const isRejected = node.state === 'REJECTED';
          return (
            <li key={node.state} className="relative flex gap-3 pb-4 last:pb-0">
              {index < nodes.length - 1 ? (
                <span
                  className={cn(
                    'absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5',
                    isDone ? 'bg-sky-700' : 'bg-border',
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={cn(
                  'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                  isDone && 'border-sky-700 bg-sky-700 text-white',
                  isCurrent &&
                    !isRejected &&
                    'border-sky-700 bg-sky-100 text-sky-800',
                  isCurrent &&
                    isRejected &&
                    'border-danger-text bg-danger-bg text-danger-text',
                  !isDone &&
                    !isCurrent &&
                    'border-border bg-surface text-ink-muted',
                )}
                aria-hidden="true"
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isRejected ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    'text-small font-semibold',
                    isCurrent ? 'text-ink' : isDone ? 'text-sky-800' : 'text-ink-muted',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {node.label}
                  {isCurrent ? <span className="sr-only"> (estado actual)</span> : null}
                </p>
                {!compact ? (
                  <p className="mt-0.5 text-small text-ink-soft">{node.hint}</p>
                ) : null}
                {isCurrent && createdAt !== undefined && index === 0 ? (
                  <p className="mt-0.5 text-caption text-ink-muted">
                    Reportado el {createdAt}
                  </p>
                ) : null}
                {node.state === 'RESOLVED' && resolvedAt !== undefined && resolvedAt !== null ? (
                  <p className="mt-0.5 text-caption text-ink-muted">
                    Resuelto el {resolvedAt}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-caption text-ink-soft">
        La gestión de estados la realiza el municipio. Este seguimiento es
        informativo.
      </p>
    </div>
  );
}
