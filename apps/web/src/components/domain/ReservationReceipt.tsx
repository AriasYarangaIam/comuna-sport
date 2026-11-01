import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import type { ReservationDto, SpaceDto } from '../../types/api';
import {
  formatDateLong,
  formatDateTime,
  formatTimeRange,
} from '../../lib/datetime';
import { getRoleOption } from '../../lib/pricing';
import { Button } from '../ui/Button';
import { PriceSummary } from './PriceSummary';
import { ReservationStatusBadge } from './StatusBadge';

export interface ReservationReceiptProps {
  reservation: ReservationDto;
  space: SpaceDto | undefined;
  actions?: ReactNode;
}

const copyToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard !== undefined) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

export function ReservationReceipt({
  reservation,
  space,
  actions,
}: ReservationReceiptProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const role = getRoleOption(reservation.role);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const handleCopy = async (): Promise<void> => {
    try {
      await copyToClipboard(reservation.id);
      setCopied(true);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div className="border-b border-border bg-sky-800 px-5 py-4 text-white">
        <p className="text-caption uppercase tracking-wide text-sky-100">
          Comprobante de reserva
        </p>
        <h2 className="mt-1 text-headline-md">
          {space?.name ?? 'Espacio deportivo municipal'}
        </h2>
        <p className="mt-1 text-small text-sky-100">
          {formatDateLong(reservation.timeSlot.start)} ·{' '}
          <span className="tabular-nums">
            {formatTimeRange(reservation.timeSlot.start, reservation.timeSlot.end)}
          </span>{' '}
          (America/Lima)
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ReservationStatusBadge isActive={reservation.isActive} />
          <p className="text-small text-ink-soft">
            Creada el{' '}
            <span className="tabular-nums">{formatDateTime(reservation.createdAt)}</span>
          </p>
        </div>

        <div>
          <h3 className="text-small font-semibold uppercase tracking-wide text-ink-soft">
            Código de reserva
          </h3>
          <div className="mt-2 flex flex-col gap-2 rounded-control border border-border bg-canvas p-3 sm:flex-row sm:items-center sm:justify-between">
            <code className="break-all font-mono text-small text-ink">
              {reservation.id}
            </code>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleCopy()}
              aria-label="Copiar código de reserva"
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <p
            className="mt-1.5 min-h-5 text-small font-medium text-success-text"
            role="status"
            aria-live="polite"
          >
            {copied ? 'Código copiado al portapapeles.' : ''}
          </p>
        </div>

        <PriceSummary
          baseAmount={space?.basePrice.amount ?? reservation.cost.amount}
          currency={reservation.cost.currency}
          role={reservation.role}
          totalAmount={reservation.cost.amount}
        />

        <div className="rounded-control border border-sky-200 bg-info-bg p-3 text-small text-info-text">
          <p className="font-semibold">Reserva registrada</p>
          <p className="mt-1">
            El municipio validará el uso del espacio. Guarda este código para
            cualquier consulta en la mesa de partes.
          </p>
          {role.adjustmentLabel !== null ? (
            <p className="mt-1">Tarifa aplicada: {role.adjustmentLabel}.</p>
          ) : null}
        </div>

        {actions !== undefined ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
