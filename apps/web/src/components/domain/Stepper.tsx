import { Check, X } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface StepperProps {
  steps: readonly string[];
  current: number;
  errorStep?: number | null;
  className?: string;
}

export function Stepper({ steps, current, errorStep, className }: StepperProps) {
  return (
    <nav aria-label="Pasos de la reserva" className={className}>
      <ol className="flex items-start gap-2">
        {steps.map((step, index) => {
          const isCurrent = index === current;
          const isCompleted = index < current;
          const hasError = errorStep === index;
          return (
            <li
              key={step}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex w-full items-center gap-2">
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-caption font-semibold',
                    isCompleted && 'border-sky-700 bg-sky-700 text-white',
                    isCurrent && !hasError && 'border-sky-700 bg-sky-100 text-sky-800',
                    hasError && 'border-danger-text bg-danger-bg text-danger-text',
                    !isCompleted && !isCurrent && !hasError && 'border-border bg-surface text-ink-muted',
                  )}
                  aria-hidden="true"
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : hasError ? (
                    <X className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                {index < steps.length - 1 ? (
                  <span
                    className={cn(
                      'h-0.5 min-w-0 flex-1 rounded-pill',
                      isCompleted ? 'bg-sky-700' : 'bg-border',
                    )}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <span
                className={cn(
                  'w-full truncate text-caption',
                  isCurrent ? 'font-semibold text-ink' : 'text-ink-soft',
                  hasError && 'text-danger-text',
                )}
              >
                <span className="sr-only">
                  Paso {index + 1} de {steps.length}:{' '}
                </span>
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
