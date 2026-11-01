import type { UserRoleType } from '../../types/api';
import { calculateCost, getRoleOption } from '../../lib/pricing';
import { formatAmount } from '../../lib/format';
import { InlineAlert } from '../ui/InlineAlert';
import { Skeleton } from '../ui/Skeleton';

export interface PriceSummaryProps {
  baseAmount: number;
  currency: string;
  role: UserRoleType;
  totalAmount?: number;
  status?: 'ready' | 'calculating' | 'error';
  errorMessage?: string;
}

export function PriceSummary({
  baseAmount,
  currency,
  role,
  totalAmount,
  status = 'ready',
  errorMessage = 'No pudimos calcular la tarifa. Vuelve a intentarlo.',
}: PriceSummaryProps) {
  const option = getRoleOption(role);
  const total = totalAmount ?? calculateCost(baseAmount, option.factor);
  const adjustment = Math.round((total - baseAmount + Number.EPSILON) * 100) / 100;

  if (status === 'error') {
    return (
      <InlineAlert tone="danger" title="Error al calcular la tarifa">
        {errorMessage}
      </InlineAlert>
    );
  }

  if (status === 'calculating') {
    return (
      <div
        className="rounded-card border border-border bg-tint p-4"
        aria-busy="true"
        aria-label="Calculando tarifa"
      >
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <Skeleton className="mt-4 h-6 w-1/2" />
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-tint p-4">
      <h3 className="text-headline-sm text-ink">Resumen de tarifa</h3>
      <dl className="mt-3 space-y-2 text-small">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-soft">Precio base del espacio</dt>
          <dd className="font-medium tabular-nums text-ink">
            {formatAmount(baseAmount)} {currency}
          </dd>
        </div>

        {option.adjustmentLabel !== null ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-soft">{option.adjustmentLabel}</dt>
            <dd className="font-medium tabular-nums text-ink">
              {adjustment < 0 ? '−' : '+'}
              {formatAmount(Math.abs(adjustment))} {currency}
            </dd>
          </div>
        ) : null}

        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
          <dt className="text-body font-semibold text-ink">Total a pagar</dt>
          <dd
            className="text-headline-sm font-semibold tabular-nums text-sky-800"
            aria-live="polite"
            aria-atomic="true"
          >
            {formatAmount(total)} {currency}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-caption text-ink-soft">
        El servidor confirma el monto definitivo al registrar la reserva.
      </p>
    </div>
  );
}
