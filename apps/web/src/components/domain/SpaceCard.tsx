import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Users, Wallet, Wrench } from 'lucide-react';
import type { SpaceDto } from '../../types/api';
import { describeWindow, SPACE_TYPE_META } from '../../lib/spaces';
import { formatCapacity, formatCurrency } from '../../lib/format';
import { cn } from '../../lib/cn';
import { buttonStyles } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SpaceStatusBadge } from './StatusBadge';

export interface SpaceCardProps {
  space: SpaceDto;
  reserveHref?: string;
  reportHref?: string;
  ctaLabel?: string;
  className?: string;
}

export function SpaceCard({
  space,
  reserveHref,
  reportHref,
  ctaLabel = 'Ver horarios y reservar',
  className,
}: SpaceCardProps) {
  const type = SPACE_TYPE_META[space.type];
  const TypeIcon = type.icon;
  const disabled = !space.isActive;
  const reserveTo = reserveHref ?? `/disponibilidad?spaceId=${encodeURIComponent(space.id)}`;
  const reportTo =
    reportHref ?? `/incidentes?spaceId=${encodeURIComponent(space.id)}`;
  const disabledReason = 'Este espacio está fuera de servicio temporalmente.';

  return (
    <article
      className={cn(
        'flex min-w-0 flex-col rounded-card border bg-surface p-5 shadow-card transition-shadow',
        disabled
          ? 'border-danger-text/40 bg-surface/80'
          : 'border-border hover:shadow-raised',
        className,
      )}
      aria-labelledby={`space-${space.id}-title`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Badge tone="info" icon={TypeIcon}>
          {type.shortLabel}
        </Badge>
        <SpaceStatusBadge isActive={space.isActive} />
      </div>

      <h3
        id={`space-${space.id}-title`}
        className={cn(
          'mt-3 text-headline-sm text-ink',
          disabled && 'text-ink-soft',
        )}
        title={space.name}
      >
        {space.name}
      </h3>

      <dl className="mt-3 space-y-1.5 text-small text-ink-soft">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Aforo</dt>
          <Users className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
          <dd>{formatCapacity(space.capacity)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Tarifa base</dt>
          <Wallet className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
          <dd>
            <span className="font-medium tabular-nums text-ink">
              {formatCurrency(space.basePrice.amount, space.basePrice.currency)}
            </span>{' '}
            por bloque
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Horario</dt>
          <Clock className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
          <dd className="tabular-nums">{describeWindow(space)}</dd>
        </div>
      </dl>

      <div className="mt-auto space-y-2 pt-5">
        {disabled ? (
          <>
            <span
              className={cn(
                buttonStyles({ variant: 'secondary', fullWidth: true }),
                'cursor-not-allowed opacity-50',
              )}
              aria-disabled="true"
              title={disabledReason}
            >
              No disponible
            </span>
            <p className="text-caption text-danger-text">{disabledReason}</p>
          </>
        ) : (
          <>
            <Link
              to={reserveTo}
              className={buttonStyles({ variant: 'primary', fullWidth: true })}
              data-touch-target
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to={reportTo}
              className={buttonStyles({ variant: 'ghost', fullWidth: true })}
              data-touch-target
            >
              <Wrench className="h-4 w-4" aria-hidden="true" />
              Reportar un daño
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
