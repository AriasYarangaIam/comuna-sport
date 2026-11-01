import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  RefreshCw,
  Search,
  SearchX,
  Wrench,
} from 'lucide-react';
import type { ReservationDto } from '../../types/api';
import {
  useSpaces,
  useUserReservations,
} from '../../hooks/useComunaSport';
import { toUserFacingError } from '../../lib/errors';
import { formatCurrency } from '../../lib/format';
import {
  formatDateLong,
  formatDateTime,
  formatTimeRange,
} from '../../lib/datetime';
import { getRoleOption } from '../../lib/pricing';
import { SPACE_TYPE_META } from '../../lib/spaces';
import { useUiStore } from '../../stores/ui';
import { cn } from '../../lib/cn';
import { Button, buttonStyles } from '../../components/ui/Button';
import { InlineAlert } from '../../components/ui/InlineAlert';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { TextInput } from '../../components/ui/Input';
import { ReservationStatusBadge } from '../../components/domain/StatusBadge';

type Filter = 'all' | 'active' | 'inactive';

export function MyReservationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lastUserId = useUiStore((state) => state.lastUserId);
  const setLastUserId = useUiStore((state) => state.setLastUserId);

  const initialUserId = searchParams.get('userId') ?? lastUserId;
  const [input, setInput] = useState(initialUserId);
  const [activeUserId, setActiveUserId] = useState(initialUserId);
  const [inputError, setInputError] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>('all');

  const {
    data: reservations,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useUserReservations(activeUserId);
  const { data: spaces } = useSpaces();

  const spaceNames = useMemo(
    () =>
      new Map((spaces ?? []).map((space) => [space.id, space])),
    [spaces],
  );

  const sorted = useMemo(
    () =>
      [...(reservations ?? [])].sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
      ),
    [reservations],
  );

  const counts = useMemo(
    () => ({
      all: sorted.length,
      active: sorted.filter((reservation) => reservation.isActive).length,
      inactive: sorted.filter((reservation) => !reservation.isActive).length,
    }),
    [sorted],
  );

  const visible = sorted.filter((reservation) => {
    if (filter === 'all') return true;
    return filter === 'active' ? reservation.isActive : !reservation.isActive;
  });

  const copy = isError ? toUserFacingError(error, 'reservations') : null;

  const handleSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = input.trim();
    if (trimmed === '') {
      setInputError('Ingresa tu identificador para buscar tus reservas.');
      return;
    }
    setInputError(undefined);
    setActiveUserId(trimmed);
    setLastUserId(trimmed);
    setSearchParams({ userId: trimmed });
    setFilter('all');
  };

  return (
    <div className="mx-auto max-w-[1040px] px-4 py-6 md:px-6 md:py-8">
      <header>
        <h1 className="text-headline-lg text-ink md:text-display">Mis reservas</h1>
        <p className="mt-2 max-w-2xl text-pretty text-body text-ink-soft">
          Consulta el historial de reservas asociado a tu identificador. No
          necesitas cuenta ni contraseña.
        </p>
      </header>

      <form
        onSubmit={handleSearch}
        className="mt-5 rounded-card border border-border bg-surface p-4 shadow-card md:p-5"
        noValidate
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextInput
            id="reservations-user-id"
            label="ID de usuario o DNI"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setInputError(undefined);
            }}
            placeholder="user-vecino-4589"
            hint="El mismo identificador que usaste al reservar."
            error={inputError}
            containerClassName="flex-1"
            autoComplete="username"
          />
          <Button type="submit" className="sm:mb-0">
            <Search className="h-4 w-4" aria-hidden="true" />
            Buscar reservas
          </Button>
        </div>
      </form>

      {activeUserId.trim() === '' ? (
        <div className="mt-6">
          <InlineAlert tone="info" title="Ingresa tu identificador">
            Usa el mismo ID o DNI con el que registraste la reserva. Lo
            encuentras en el comprobante digital.
          </InlineAlert>
        </div>
      ) : (
        <section className="mt-6" aria-labelledby="lista-reservas">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="lista-reservas" className="text-headline-md text-ink">
                Reservas de {activeUserId}
              </h2>
              <p className="mt-1 text-small text-ink-soft" role="status" aria-live="polite">
                {isPending
                  ? 'Buscando reservas…'
                  : `${counts.all} ${counts.all === 1 ? 'reserva registrada' : 'reservas registradas'}`}
              </p>
            </div>

            <div
              className="flex gap-1 rounded-pill border border-border bg-surface p-1"
              role="group"
              aria-label="Filtrar reservas por estado"
            >
              {(
                [
                  ['all', 'Todas', counts.all],
                  ['active', 'Activas', counts.active],
                  ['inactive', 'Inactivas', counts.inactive],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    'min-h-12 rounded-pill px-3 text-small font-medium transition-colors',
                    filter === value
                      ? 'bg-sky-700 text-white'
                      : 'text-ink-soft hover:bg-sky-50 hover:text-ink',
                  )}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {isPending ? <ListSkeleton rows={3} /> : null}

            {copy !== null ? (
              <InlineAlert
                tone={copy.tone}
                title={copy.title}
                action={
                  <Button
                    variant="secondary"
                    onClick={() => void refetch()}
                    loading={isFetching}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Reintentar
                  </Button>
                }
              >
                {copy.description}
              </InlineAlert>
            ) : null}

            {!isPending && copy === null && visible.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title={
                  counts.all === 0
                    ? 'Aún no tienes reservas con este identificador'
                    : 'No hay reservas con este filtro'
                }
                description={
                  counts.all === 0
                    ? 'Cuando reserves un espacio, aparecerá aquí con su comprobante digital. Revisa que el identificador sea el mismo que usaste.'
                    : 'Cambia el filtro para ver el resto de tus reservas.'
                }
                action={
                  counts.all === 0 ? (
                    <Link to="/" className={buttonStyles()}>
                      Explorar espacios
                    </Link>
                  ) : (
                    <Button variant="secondary" onClick={() => setFilter('all')}>
                      Ver todas
                    </Button>
                  )
                }
              />
            ) : null}

            {!isPending && copy === null && visible.length > 0 ? (
              <ul className="space-y-3">
                {visible.map((reservation) => (
                  <ReservationRow
                    key={reservation.id}
                    reservation={reservation}
                    spaceName={
                      spaceNames.get(reservation.spaceId)?.name ??
                      'Espacio deportivo municipal'
                    }
                    spaceType={
                      spaceNames.get(reservation.spaceId)?.type ?? null
                    }
                  />
                ))}
              </ul>
            ) : null}

            <p className="mt-5 text-small text-ink-soft">
              Esta versión no permite cancelar reservas desde la web. Si
              necesitas anular una, contacta a la mesa de partes del municipio.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function ReservationRow({
  reservation,
  spaceName,
  spaceType,
}: {
  reservation: ReservationDto;
  spaceName: string;
  spaceType: keyof typeof SPACE_TYPE_META | null;
}) {
  const TypeIcon =
    spaceType === null ? CalendarDays : SPACE_TYPE_META[spaceType].icon;
  const role = getRoleOption(reservation.role);

  return (
    <li className="rounded-card border border-border bg-surface p-4 shadow-card md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <TypeIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="min-w-0 text-headline-sm text-ink" title={spaceName}>
              {spaceName}
            </h3>
            <ReservationStatusBadge isActive={reservation.isActive} />
          </div>

          <p className="mt-3 text-body text-ink">
            {formatDateLong(reservation.timeSlot.start)} ·{' '}
            <span className="tabular-nums">
              {formatTimeRange(reservation.timeSlot.start, reservation.timeSlot.end)}
            </span>{' '}
            <span className="text-small text-ink-soft">(America/Lima)</span>
          </p>
          <p className="mt-1 text-small text-ink-soft">
            Total:{' '}
            <span className="font-semibold tabular-nums text-ink">
              {formatCurrency(reservation.cost.amount, reservation.cost.currency)}
            </span>{' '}
            · {role.label}
          </p>
          <p className="mt-1 break-all text-caption text-ink-muted">
            Código <span className="font-mono">{reservation.id}</span>
          </p>
          <p className="mt-1 text-caption text-ink-muted">
            Registrada el {formatDateTime(reservation.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
          <Link
            to={`/recibo/${encodeURIComponent(reservation.id)}`}
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            Ver detalle
          </Link>
          <Link
            to={`/incidentes?spaceId=${encodeURIComponent(reservation.spaceId)}`}
            className={buttonStyles({ variant: 'ghost', size: 'sm' })}
          >
            <Wrench className="h-4 w-4" aria-hidden="true" />
            Reportar un daño
          </Link>
        </div>
      </div>
    </li>
  );
}
