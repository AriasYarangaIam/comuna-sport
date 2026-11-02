import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  RefreshCw,
  SearchX,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import type { SpaceDto } from '../../types/api';
import { useAvailability, useSpaces } from '../../hooks/useComunaSport';
import {
  addDaysToDateKey,
  addMinutes,
  formatDateKeyLong,
  formatTimeRange,
  fromLimaWallClock,
  minutesToTimeKey,
  timeKeyToMinutes,
  todayLimaDateKey,
} from '../../lib/datetime';
import {
  getWindowForDate,
  suggestSlot,
} from '../../lib/spaces';
import { toUserFacingError } from '../../lib/errors';
import { cn } from '../../lib/cn';
import { Button, buttonStyles } from '../../components/ui/Button';
import { InlineAlert } from '../../components/ui/InlineAlert';
import { EmptyState } from '../../components/ui/EmptyState';
import { SpaceGridSkeleton, ListSkeleton } from '../../components/ui/Skeleton';
import { TextInput } from '../../components/ui/Input';
import { SpaceCard } from '../../components/domain/SpaceCard';

type Duration = 1 | 2 | 3 | 'day';

const durationOptions: readonly { value: Duration; label: string }[] = [
  { value: 1, label: '1 h' },
  { value: 2, label: '2 h' },
  { value: 3, label: '3 h' },
  { value: 'day', label: 'Todo el día' },
];

const defaultStartFor = (
  space: SpaceDto | undefined,
  dateKey: string,
  duration: Duration,
): string => {
  if (duration === 'day') {
    return space === undefined
      ? '08:00'
      : (getWindowForDate(space, dateKey)?.startTime ?? '');
  }
  const window = space === undefined ? null : getWindowForDate(space, dateKey);
  const earliest = window?.startTime ?? '08:00';
  const latest =
    window === null
      ? minutesToTimeKey((22 - duration) * 60)
      : minutesToTimeKey(
          timeKeyToMinutes(window.endTime) - duration * 60,
        );
  if (timeKeyToMinutes(earliest) > timeKeyToMinutes(latest)) {
    return earliest;
  }
  return earliest;
};

const startOptionsFor = (
  space: SpaceDto | undefined,
  dateKey: string,
  duration: Duration,
): string[] => {
  if (duration === 'day') {
    return [];
  }
  const window = space === undefined ? null : getWindowForDate(space, dateKey);
  const start = window === null ? 8 : timeKeyToMinutes(window.startTime) / 60;
  const end =
    window === null ? 22 : timeKeyToMinutes(window.endTime) / 60;
  const options: string[] = [];
  for (let hour = start; hour + duration <= end; hour += 1) {
    options.push(minutesToTimeKey(hour * 60));
  }
  return options;
};

export function AvailabilityPage() {
  const [searchParams] = useSearchParams();
  const spaceId = searchParams.get('spaceId') ?? '';
  const {
    data: spaces,
    isPending: spacesPending,
    isError: spacesError,
    error: spacesErrorObject,
    refetch: refetchSpaces,
    isFetching: spacesFetching,
  } = useSpaces();

  const selectedSpace = useMemo(
    () => (spaces ?? []).find((space) => space.id === spaceId),
    [spaces, spaceId],
  );

  const initialisedFor = useRef<string | null>(null);
  const [dateKey, setDateKey] = useState(todayLimaDateKey());
  const [duration, setDuration] = useState<Duration>(2);
  const [startTime, setStartTime] = useState('09:00');

  useEffect(() => {
    if (spacesPending) {
      return;
    }
    const key = spaceId === '' ? '__all__' : spaceId;
    if (initialisedFor.current === key) {
      return;
    }
    const suggestion = suggestSlot(selectedSpace, 2);
    setDateKey(suggestion.dateKey);
    setStartTime(suggestion.startTime);
    setDuration(2);
    initialisedFor.current = key;
  }, [spaceId, spacesPending, selectedSpace]);

  const startOptions = startOptionsFor(selectedSpace, dateKey, duration);

  useEffect(() => {
    if (duration === 'day') {
      return;
    }
    if (startOptions.length === 0) {
      return;
    }
    if (!startOptions.includes(startTime)) {
      setStartTime(startOptions[0] ?? '');
    }
  }, [duration, startOptions, startTime]);

  const band = useMemo(() => {
    if (dateKey === '') {
      return null;
    }
    if (duration === 'day') {
      const window =
        selectedSpace === undefined ? null : getWindowForDate(selectedSpace, dateKey);
      const start = window?.startTime ?? '08:00';
      const end = window?.endTime ?? '22:00';
      if (timeKeyToMinutes(end) <= timeKeyToMinutes(start)) {
        return null;
      }
      const startDate = fromLimaWallClock(dateKey, start);
      const endDate = fromLimaWallClock(dateKey, end);
      return {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        startTime: start,
        endTime: end,
        label: 'Todo el día',
      };
    }
    if (startTime === '') {
      return null;
    }
    const startDate = fromLimaWallClock(dateKey, startTime);
    const endDate = addMinutes(startDate, duration * 60);
    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      startTime,
      endTime: minutesToTimeKey(
        timeKeyToMinutes(startTime) + duration * 60,
      ),
      label: `${duration} ${duration === 1 ? 'hora' : 'horas'}`,
    };
  }, [dateKey, duration, selectedSpace, startTime]);

  const {
    data: availableSpaces,
    isPending: availabilityPending,
    isFetching: availabilityFetching,
    isError: availabilityError,
    error: availabilityErrorObject,
    refetch: refetchAvailability,
  } = useAvailability(band?.start, band?.end);

  const availabilityCopy = availabilityError
    ? toUserFacingError(availabilityErrorObject, 'availability')
    : null;
  const spacesCopy = spacesError
    ? toUserFacingError(spacesErrorObject, 'spaces')
    : null;

  const freeSpaces = availableSpaces ?? [];
  const selectedIsFree =
    spaceId === '' ? true : freeSpaces.some((space) => space.id === spaceId);
  const alternatives =
    spaceId === '' ? freeSpaces : freeSpaces.filter((space) => space.id !== spaceId);
  const visibleSpaces =
    spaceId === '' ? freeSpaces : selectedIsFree ? [selectedSpace].filter((s): s is SpaceDto => s !== undefined) : alternatives;

  const reserveHref = (spaceIdValue: string): string => {
    if (band === null) {
      return `/reservar/${spaceIdValue}`;
    }
    const params = new URLSearchParams({
      start: band.start,
      end: band.end,
    });
    return `/reservar/${spaceIdValue}?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6 md:py-8">
      <Link
        to="/"
        className="inline-flex min-h-12 items-center gap-2 rounded-control text-small font-medium text-sky-800 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver al explorador
      </Link>

      <header className="mt-3">
        <h1 className="text-headline-lg text-ink md:text-display">
          ¿Cuándo quieres jugar?
        </h1>
        <p className="mt-2 max-w-2xl text-pretty text-body text-ink-soft">
          Elige un día y un bloque. Consultamos la disponibilidad real del
          servidor municipal; la reserva se confirma al final.
        </p>
        {selectedSpace !== undefined ? (
          <p className="mt-2 text-small text-ink-soft">
            Espacio seleccionado:{' '}
            <span className="font-semibold text-ink">{selectedSpace.name}</span>
          </p>
        ) : null}
      </header>

      <section
        aria-labelledby="filtros-disponibilidad"
        className="mt-6 rounded-card border border-border bg-surface p-4 shadow-card md:p-5"
      >
        <h2 id="filtros-disponibilidad" className="sr-only">
          Filtros de disponibilidad
        </h2>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <TextInput
            label="Fecha"
            type="date"
            value={dateKey}
            min={todayLimaDateKey()}
            max={addDaysToDateKey(todayLimaDateKey(), 30)}
            onChange={(event) => {
              const nextDate = event.target.value;
              setDateKey(nextDate);
              setStartTime(defaultStartFor(selectedSpace, nextDate, duration));
            }}
          />

          <fieldset>
            <legend className="text-small font-medium text-ink">Duración</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {durationOptions.map((option) => {
                const active = duration === option.value;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setDuration(option.value);
                      setStartTime(
                        defaultStartFor(selectedSpace, dateKey, option.value),
                      );
                    }}
                    className={cn(
                      'inline-flex min-h-12 items-center gap-1.5 rounded-control border px-4 text-small font-medium transition-colors',
                      active
                        ? 'border-sky-700 bg-sky-700 text-white'
                        : 'border-border bg-surface text-ink-soft hover:border-sky-300 hover:text-ink',
                    )}
                  >
                    <Timer className="h-4 w-4" aria-hidden="true" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        {duration !== 'day' ? (
          <div className="mt-5">
            <p className="text-small font-medium text-ink" id="hora-inicio-label">
              Hora de inicio
            </p>
            <div
              className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none"
              role="group"
              aria-labelledby="hora-inicio-label"
            >
              {startOptions.length === 0 ? (
                <p className="text-small text-ink-soft">
                  No hay horas disponibles para esa fecha y duración.
                </p>
              ) : (
                startOptions.map((option) => {
                  const active = startTime === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setStartTime(option)}
                      className={cn(
                        'min-h-12 shrink-0 rounded-control border px-4 text-small font-medium tabular-nums transition-colors',
                        active
                          ? 'border-sky-700 bg-sky-100 text-sky-900'
                          : 'border-border bg-surface text-ink-soft hover:border-sky-300 hover:text-ink',
                      )}
                    >
                      {option}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        {band !== null ? (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-small text-ink-soft">
            <CalendarClock className="h-4 w-4 text-sky-700" aria-hidden="true" />
            <span>
              Resultado para{' '}
              <span className="font-medium text-ink">
                {formatDateKeyLong(dateKey)}
              </span>{' '}
              ·{' '}
              <span className="font-medium tabular-nums text-ink">
                {formatTimeRange(band.start, band.end)}
              </span>{' '}
              ({band.label}, America/Lima)
            </span>
          </p>
        ) : null}
      </section>

      <section className="mt-7" aria-labelledby="resultados-disponibilidad">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="resultados-disponibilidad" className="text-headline-md text-ink">
            Espacios libres para ese bloque
          </h2>
          {availabilityFetching ? (
            <span className="text-small text-ink-soft" role="status">
              Actualizando…
            </span>
          ) : null}
        </div>

        <div className="mt-4">
          {spacesCopy !== null ? (
            <InlineAlert
              tone={spacesCopy.tone}
              title={spacesCopy.title}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void refetchSpaces()}
                  loading={spacesFetching}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Reintentar
                </Button>
              }
            >
              {spacesCopy.description}
            </InlineAlert>
          ) : spacesPending ? (
            <ListSkeleton rows={2} />
          ) : availabilityCopy !== null ? (
            <InlineAlert
              tone={availabilityCopy.tone}
              title={availabilityCopy.title}
              action={
                availabilityCopy.retryable ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void refetchAvailability()}
                  >
                    Reintentar
                  </Button>
                ) : undefined
              }
            >
              {availabilityCopy.description}
            </InlineAlert>
          ) : band === null ? (
            <EmptyState
              icon={TriangleAlert}
              title="Revisa la fecha y la duración"
              description="Elige una fecha con horario de atención y una duración válida para consultar la disponibilidad."
            />
          ) : availabilityPending ? (
            <SpaceGridSkeleton count={2} />
          ) : spaceId !== '' && !selectedIsFree ? (
            <div className="space-y-4">
              <InlineAlert tone="warning" title="Ese espacio no está libre en ese bloque">
                Otro vecino ya reservó esta franja. Puedes elegir otro horario o
                reservar uno de los espacios libres que aparecen abajo.
              </InlineAlert>
              {alternatives.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="No hay espacios libres en ese bloque"
                  description="Prueba con otra hora, otra duración o consulta todo el día."
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setDuration('day');
                        setStartTime(
                          defaultStartFor(selectedSpace, dateKey, 'day'),
                        );
                      }}
                    >
                      Ver todo el día
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {alternatives.map((space) => (
                    <SpaceCard
                      key={space.id}
                      space={space}
                      reserveHref={reserveHref(space.id)}
                      ctaLabel="Reservar este bloque"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : visibleSpaces.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No hay espacios libres en ese bloque"
              description="Prueba con otra hora, otra duración o consulta todo el día."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDuration('day');
                    setStartTime(defaultStartFor(selectedSpace, dateKey, 'day'));
                  }}
                >
                  Ver todo el día
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleSpaces.map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  reserveHref={reserveHref(space.id)}
                  ctaLabel="Reservar este bloque"
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-card border border-border bg-tint p-4 text-small text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-pretty">
            La disponibilidad es informativa. El servidor valida el solapamiento
            al confirmar: si otro vecino se adelanta, te lo avisamos al instante.
          </p>
          <Link
            to="/"
            className={buttonStyles({ variant: 'ghost', size: 'sm' })}
          >
            Explorar todos los espacios
          </Link>
        </div>
      </section>
    </div>
  );
}
