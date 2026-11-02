import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarX,
  Info,
  RefreshCw,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react';
import type { UserRoleType } from '../../types/api';
import {
  useAvailability,
  useCreateReservation,
  useSpace,
} from '../../hooks/useComunaSport';
import {
  isSameLimaDay,
  timeKeyToMinutes,
  toLimaDateKey,
  toLimaIso,
  toLimaTimeKey,
} from '../../lib/datetime';
import {
  getWindowForDate,
  SPACE_TYPE_META,
  suggestSlot,
} from '../../lib/spaces';
import { formatCapacity, formatCurrency } from '../../lib/format';
import {
  isIdempotencyConflict,
  toUserFacingError,
  type UserFacingError,
} from '../../lib/errors';
import { createIdempotencyKey, shortIdempotencyKey } from '../../lib/idempotency';
import { ApiError } from '../../lib/api';
import { useUiStore } from '../../stores/ui';
import { cn } from '../../lib/cn';
import { Button, buttonStyles } from '../../components/ui/Button';
import { InlineAlert } from '../../components/ui/InlineAlert';
import { EmptyState } from '../../components/ui/EmptyState';
import { Dialog } from '../../components/ui/Dialog';
import { PageSkeleton } from '../../components/ui/Skeleton';
import { TextInput } from '../../components/ui/Input';
import { Stepper } from '../../components/domain/Stepper';
import { RoleSelector } from '../../components/domain/RoleSelector';
import { TimeSlotPicker } from '../../components/domain/TimeSlotPicker';
import { PriceSummary } from '../../components/domain/PriceSummary';
import { SpaceStatusBadge } from '../../components/domain/StatusBadge';

const STEPS = ['Identificación', 'Categoría', 'Horario y tarifa'] as const;

interface ReservationErrors {
  userId?: string;
  date?: string;
  start?: string;
  end?: string;
}

export function ReservationPage() {
  const { spaceId = '' } = useParams<{ spaceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const lastUserId = useUiStore((state) => state.lastUserId);
  const setLastUserId = useUiStore((state) => state.setLastUserId);

  const {
    data: space,
    isPending: spacePending,
    isError: spaceError,
    error: spaceErrorObject,
    refetch: refetchSpace,
    isFetching: spaceFetching,
  } = useSpace(spaceId);

  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState(lastUserId);
  const [role, setRole] = useState<UserRoleType>('NEIGHBOR');
  const [dateKey, setDateKey] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [errors, setErrors] = useState<ReservationErrors>({});
  const [submitError, setSubmitError] = useState<UserFacingError | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);

  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const initialisedFor = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const mutation = useCreateReservation();

  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  useEffect(() => {
    if (space === undefined || spacePending) {
      return;
    }
    const key = `${spaceId}|${startParam ?? ''}|${endParam ?? ''}`;
    if (initialisedFor.current === key) {
      return;
    }
    if (startParam !== null && endParam !== null) {
      const start = new Date(startParam);
      const end = new Date(endParam);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        setDateKey(toLimaDateKey(start));
        setStartTime(toLimaTimeKey(start));
        setEndTime(toLimaTimeKey(end));
        initialisedFor.current = key;
        return;
      }
    }
    const suggestion = suggestSlot(space, 2);
    setDateKey(suggestion.dateKey);
    setStartTime(suggestion.startTime);
    setEndTime(suggestion.endTime);
    initialisedFor.current = key;
  }, [space, spacePending, spaceId, startParam, endParam]);

  const startIso =
    dateKey !== '' && startTime !== '' ? toLimaIso(dateKey, startTime) : '';
  const endIso =
    dateKey !== '' && endTime !== '' ? toLimaIso(dateKey, endTime) : '';

  // Ciclo de la llave: rota solo cuando cambian identidad, rol o franja.
  useEffect(() => {
    setIdempotencyKey(createIdempotencyKey());
  }, [userId, role, startIso, endIso]);

  useEffect(() => {
    if (step > 0) {
      headingRef.current?.focus();
    }
  }, [step]);

  const spaceCopy = spaceError
    ? toUserFacingError(spaceErrorObject, 'spaces')
    : null;

  const spaceWindow = useMemo(
    () => (space === undefined ? null : getWindowForDate(space, dateKey)),
    [space, dateKey],
  );

  const {
    data: alternatives,
    isPending: alternativesPending,
  } = useAvailability(
    conflictOpen && startIso !== '' ? startIso : undefined,
    conflictOpen && endIso !== '' ? endIso : undefined,
  );

  const conflictAlternatives = (alternatives ?? []).filter(
    (candidate) => candidate.id !== spaceId,
  );

  const validate = (targetStep: number): boolean => {
    const nextErrors: ReservationErrors = {};

    if (targetStep === 0 && userId.trim() === '') {
      nextErrors.userId = 'Ingresa tu identificador o DNI.';
    }

    if (targetStep === 2) {
      if (dateKey === '') {
        nextErrors.date = 'Elige una fecha.';
      } else if (spaceWindow === null) {
        nextErrors.date = 'Ese día el espacio no tiene horario de atención.';
      }
      if (startTime === '') {
        nextErrors.start = 'Selecciona la hora de inicio.';
      }
      if (endTime === '') {
        nextErrors.end = 'Selecciona la hora de fin.';
      }
      if (
        startTime !== '' &&
        endTime !== '' &&
        timeKeyToMinutes(endTime) <= timeKeyToMinutes(startTime)
      ) {
        nextErrors.end = 'La hora de fin debe ser posterior a la de inicio.';
      }
      if (
        startIso !== '' &&
        endIso !== '' &&
        !Number.isNaN(new Date(startIso).getTime()) &&
        !Number.isNaN(new Date(endIso).getTime()) &&
        !isSameLimaDay(startIso, endIso)
      ) {
        nextErrors.end = 'El inicio y el fin deben ser el mismo día.';
      }
      if (spaceWindow !== null && startTime !== '' && endTime !== '') {
        const start = timeKeyToMinutes(startTime);
        const end = timeKeyToMinutes(endTime);
        if (
          start < timeKeyToMinutes(spaceWindow.startTime) ||
          end > timeKeyToMinutes(spaceWindow.endTime)
        ) {
          nextErrors.end =
            'Ese horario está fuera del horario de atención de este espacio.';
        }
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => {
        const firstInvalid =
          formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        firstInvalid?.focus();
      });
      return false;
    }
    return true;
  };

  const goNext = (): void => {
    if (!validate(step)) {
      return;
    }
    setSubmitError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goBack = (): void => {
    setErrors({});
    setSubmitError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = (): void => {
    if (space === undefined || !validate(2)) {
      return;
    }
    // Guarda síncrona: el estado de React Query no se actualiza dentro del
    // mismo evento, así que un doble toque podría disparar dos POST.
    if (submittingRef.current || mutation.isPending) {
      return;
    }
    submittingRef.current = true;
    setSubmitError(null);
    setLastUserId(userId.trim());
    mutation.mutate(
      {
        spaceId: space.id,
        idempotencyKey,
        body: {
          userId: userId.trim(),
          role,
          timeSlot: { start: startIso, end: endIso },
        },
      },
      {
        onSuccess: (reservation) => {
          navigate(`/recibo/${reservation.id}`, { replace: true });
        },
        onError: (error: unknown) => {
          const copy = toUserFacingError(error, 'reservation');
          setSubmitError(copy);
          if (error instanceof ApiError && error.code === 'RESERVATION_CONFLICT') {
            setConflictOpen(true);
          }
          if (isIdempotencyConflict(error, 'payload_mismatch')) {
            setIdempotencyKey(createIdempotencyKey());
          }
        },
        onSettled: () => {
          submittingRef.current = false;
        },
      },
    );
  };

  if (spacePending) {
    return <PageSkeleton />;
  }

  if (spaceCopy !== null) {
    return (
      <div className="mx-auto max-w-[680px] px-4 py-10 md:px-6">
        <h1 className="text-headline-lg text-ink">Reservar espacio</h1>
        <div className="mt-4">
          {spaceErrorObject instanceof ApiError &&
          spaceErrorObject.code === 'SPACE_NOT_FOUND' ? (
            <EmptyState
              icon={CalendarX}
              title="Ese espacio ya no está disponible"
              description="Puede haber pasado a mantenimiento. Vuelve al explorador para elegir otro espacio."
              action={
                <Link to="/" className={buttonStyles()}>
                  Volver al explorador
                </Link>
              }
            />
          ) : (
            <InlineAlert
              tone={spaceCopy.tone}
              title={spaceCopy.title}
              action={
                <Button
                  variant="secondary"
                  onClick={() => void refetchSpace()}
                  loading={spaceFetching}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Reintentar
                </Button>
              }
            >
              {spaceCopy.description}
            </InlineAlert>
          )}
        </div>
      </div>
    );
  }

  if (space === undefined) {
    return (
      <div className="mx-auto max-w-[680px] px-4 py-10 md:px-6">
        <h1 className="text-headline-lg text-ink">Reservar espacio</h1>
        <EmptyState
          icon={CalendarX}
          title="No encontramos ese espacio"
          description="El enlace puede estar incompleto. Vuelve al explorador para elegir un espacio."
          action={
            <Link to="/" className={buttonStyles()}>
              Volver al explorador
            </Link>
          }
        />
      </div>
    );
  }

  if (!space.isActive) {
    return (
      <div className="mx-auto max-w-[680px] px-4 py-10 md:px-6">
        <h1 className="text-headline-lg text-ink">Reservar espacio</h1>
        <div className="mt-4">
          <EmptyState
            icon={Wrench}
            title="Espacio en mantenimiento"
            description="Este espacio está fuera de servicio temporalmente y no admite reservas. Elige otro espacio de tu comuna."
            action={
              <Link to="/" className={buttonStyles()}>
                Ver otros espacios
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const type = SPACE_TYPE_META[space.type];
  const TypeIcon = type.icon;
  const baseAmount = space.basePrice.amount;

  return (
    <div className="mx-auto max-w-[1040px] px-4 py-6 md:px-6 md:py-8">
      <Link
        to="/"
        className="inline-flex min-h-12 items-center gap-2 rounded-control text-small font-medium text-sky-800 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver al explorador
      </Link>

      <div className="mt-3 overflow-hidden rounded-sheet border border-border bg-surface shadow-raised">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 md:px-6">
          <div className="min-w-0">
            <p className="text-caption font-medium uppercase tracking-wide text-sky-700">
              Reserva en 3 pasos
            </p>
            <h1 className="mt-0.5 truncate text-headline-md text-ink" title={space.name}>
              Reservar · {space.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SpaceStatusBadge isActive={space.isActive} />
              <span className="inline-flex items-center gap-1.5 text-caption text-ink-soft">
                <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {type.label}
              </span>
            </div>
          </div>
          <Link
            to="/"
            aria-label="Cerrar y volver al explorador"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sky-50 hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>

        <div className="border-b border-border bg-canvas px-5 py-4 md:px-6">
          <Stepper steps={STEPS} current={step} />
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <form
            ref={formRef}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (step < STEPS.length - 1) {
                goNext();
              } else {
                handleSubmit();
              }
            }}
            className="min-w-0 p-5 md:p-6"
          >
            {step === 0 ? (
              <section aria-labelledby="paso-identificacion">
                <h2
                  id="paso-identificacion"
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-headline-sm text-ink outline-none"
                >
                  Identifícate para tu reserva
                </h2>
                <p className="mt-1 text-small text-ink-soft">
                  Usamos tu identificador para vincular el comprobante. No
                  creamos una cuenta ni pedimos contraseña.
                </p>
                <div className="mt-4 max-w-md">
                  <TextInput
                    id="reservation-user-id"
                    label="ID de usuario o DNI"
                    value={userId}
                    onChange={(event) => {
                      setUserId(event.target.value);
                      setErrors((current) => ({ ...current, userId: undefined }));
                    }}
                    placeholder="user-vecino-4589"
                    hint="No es una cuenta: identifica tu reserva en el comprobante."
                    error={errors.userId}
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="mt-5 flex items-start gap-2 rounded-control border border-border bg-tint p-3 text-small text-ink-soft">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
                  <p>
                    La reserva queda a nombre del identificador que ingreses.
                    Guárdalo para consultar el comprobante en “Mis reservas”.
                  </p>
                </div>
              </section>
            ) : null}

            {step === 1 ? (
              <section aria-labelledby="paso-categoria">
                <h2
                  id="paso-categoria"
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-headline-sm text-ink outline-none"
                >
                  Categoría comunitaria
                </h2>
                <p className="mt-1 text-small text-ink-soft">
                  Elige la tarifa que corresponde. El total se recalcula al
                  instante y lo confirma el servidor.
                </p>
                <div className="mt-4">
                  <RoleSelector
                    value={role}
                    baseAmount={baseAmount}
                    currency={space.basePrice.currency}
                    onChange={setRole}
                    legendHidden
                  />
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section aria-labelledby="paso-horario">
                <h2
                  id="paso-horario"
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-headline-sm text-ink outline-none"
                >
                  Horario y tarifa
                </h2>
                <p className="mt-1 text-small text-ink-soft">
                  Elige una franja dentro del horario del espacio. El inicio y el
                  fin deben ser del mismo día en America/Lima.
                </p>

                <div className="mt-4">
                  <TimeSlotPicker
                    space={space}
                    dateKey={dateKey}
                    startTime={startTime}
                    endTime={endTime}
                    errors={{
                      date: errors.date,
                      start: errors.start,
                      end: errors.end,
                    }}
                    onChange={(patch) => {
                      if (patch.dateKey !== undefined) setDateKey(patch.dateKey);
                      if (patch.startTime !== undefined) setStartTime(patch.startTime);
                      if (patch.endTime !== undefined) setEndTime(patch.endTime);
                      setErrors((current) => ({
                        ...current,
                        date: undefined,
                        start: undefined,
                        end: undefined,
                      }));
                    }}
                  />
                </div>

                <div className="mt-5 lg:hidden">
                  <PriceSummary
                    baseAmount={baseAmount}
                    currency={space.basePrice.currency}
                    role={role}
                  />
                </div>

                <p className="mt-4 text-caption text-ink-soft" data-reading-hide>
                  Referencia de operación:{' '}
                  <span className="font-mono">{shortIdempotencyKey(idempotencyKey)}</span>
                </p>
              </section>
            ) : null}

            {submitError !== null ? (
              <div className="mt-5">
                <InlineAlert
                  tone={submitError.tone}
                  title={submitError.title}
                  action={
                    submitError.code === 'RESERVATION_CONFLICT' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setConflictOpen(true)}
                      >
                        Ver alternativas
                      </Button>
                    ) : undefined
                  }
                >
                  {submitError.description}
                </InlineAlert>
              </div>
            ) : null}

            <div
              className={cn(
                'sticky bottom-16 z-30 -mx-5 -mb-5 mt-6 flex flex-col-reverse gap-2 border-t border-border bg-surface/95 px-5 py-3 backdrop-blur',
                'sm:flex-row sm:justify-between md:-mx-6 md:-mb-6 md:px-6',
                'lg:static lg:m-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none',
              )}
            >
              {step === 0 ? (
                <Link
                  to="/"
                  className={buttonStyles({ variant: 'secondary' })}
                >
                  Cancelar
                </Link>
              ) : (
                <Button variant="secondary" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Atrás
                </Button>
              )}

              <Button
                type="submit"
                loading={mutation.isPending}
                loadingLabel="Procesando…"
                fullWidth
                className="sm:w-auto"
              >
                {step < STEPS.length - 1 ? (
                  <>
                    Continuar
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                ) : (
                  'Confirmar reserva'
                )}
              </Button>
            </div>
          </form>

          <aside className="hidden border-l border-border bg-canvas p-5 lg:block">
            <h2 className="text-small font-semibold uppercase tracking-wide text-ink-soft">
              Tu reserva
            </h2>
            <div className="mt-3 rounded-card border border-border bg-surface p-4">
              <p className="text-small font-semibold text-ink">{space.name}</p>
              <dl className="mt-2 space-y-1 text-small text-ink-soft">
                <div className="flex justify-between gap-2">
                  <dt>Tipo</dt>
                  <dd className="text-ink">{type.label}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Aforo</dt>
                  <dd className="text-ink">{formatCapacity(space.capacity)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Base</dt>
                  <dd className="tabular-nums text-ink">
                    {formatCurrency(baseAmount, space.basePrice.currency)}
                  </dd>
                </div>
              </dl>
              {dateKey !== '' && startTime !== '' && endTime !== '' ? (
                <p className="mt-3 border-t border-border pt-3 text-small text-ink-soft">
                  {dateKey} ·{' '}
                  <span className="tabular-nums text-ink">
                    {startTime}–{endTime}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="mt-4">
              <PriceSummary
                baseAmount={baseAmount}
                currency={space.basePrice.currency}
                role={role}
              />
            </div>

            <p className="mt-4 text-caption text-ink-soft" data-reading-hide>
              Referencia de operación:{' '}
              <span className="font-mono">{shortIdempotencyKey(idempotencyKey)}</span>
            </p>
            <p className="mt-3 flex gap-2 text-caption text-ink-soft">
              <Info className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
              Un reintento o doble toque reutiliza la misma referencia; el
              servidor evita reservas duplicadas.
            </p>
          </aside>
        </div>
      </div>

      <Dialog
        open={conflictOpen}
        onClose={() => setConflictOpen(false)}
        title="Ese horario ya fue tomado"
        description="Otro vecino reservó este bloque hace un momento. Elige otra alternativa disponible."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setConflictOpen(false)}>
              Elegir otro horario
            </Button>
            <Button
              onClick={() => {
                setConflictOpen(false);
                setStep(2);
              }}
            >
              Cambiar fecha u hora
            </Button>
          </div>
        }
      >
        {alternativesPending ? (
          <p className="text-small text-ink-soft" role="status">
            Buscando alternativas libres…
          </p>
        ) : conflictAlternatives.length === 0 ? (
          <p className="text-small text-ink-soft">
            No encontramos otros espacios libres en ese mismo bloque. Prueba con
            otra fecha u hora.
          </p>
        ) : (
          <ul className="space-y-2">
            {conflictAlternatives.map((candidate) => (
              <li key={candidate.id}>
                <Link
                  to={`/reservar/${candidate.id}?${new URLSearchParams({
                    start: startIso,
                    end: endIso,
                  }).toString()}`}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-control border border-border bg-surface p-3 text-small transition-colors hover:border-sky-300 hover:bg-sky-50"
                >
                  <span>
                    <span className="block font-semibold text-ink">
                      {candidate.name}
                    </span>
                    <span className="block text-caption text-ink-soft">
                      {SPACE_TYPE_META[candidate.type].label} ·{' '}
                      {formatCurrency(
                        candidate.basePrice.amount,
                        candidate.basePrice.currency,
                      )}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
