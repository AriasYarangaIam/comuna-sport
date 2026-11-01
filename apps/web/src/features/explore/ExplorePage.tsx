import { useMemo, useState } from 'react';
import {
  Building2,
  CalendarCheck,
  RefreshCw,
  SearchX,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import type { SpaceType } from '../../types/api';
import { useSpaces } from '../../hooks/useComunaSport';
import { toUserFacingError } from '../../lib/errors';
import { formatAmount } from '../../lib/format';
import { SPACE_TYPE_OPTIONS } from '../../lib/spaces';
import { cn } from '../../lib/cn';
import { Button } from '../../components/ui/Button';
import { InlineAlert } from '../../components/ui/InlineAlert';
import { EmptyState } from '../../components/ui/EmptyState';
import { SpaceGridSkeleton } from '../../components/ui/Skeleton';
import { SpaceCard } from '../../components/domain/SpaceCard';

type Filter = SpaceType | 'ALL';

export function ExplorePage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const { data: spaces, isPending, isError, error, refetch, isFetching } =
    useSpaces();

  const filtered = useMemo(
    () =>
      (spaces ?? []).filter(
        (space) => filter === 'ALL' || space.type === filter,
      ),
    [spaces, filter],
  );

  const stats = useMemo(() => {
    const list = spaces ?? [];
    const active = list.filter((space) => space.isActive);
    const minPrice =
      active.length === 0
        ? null
        : Math.min(...active.map((space) => space.basePrice.amount));
    return {
      total: list.length,
      active: active.length,
      capacity: active.reduce((sum, space) => sum + space.capacity, 0),
      minPrice,
    };
  }, [spaces]);

  const errorCopy = isError ? toUserFacingError(error, 'spaces') : null;

  return (
    <div>
      <section className="surface-wash border-b border-border">
        <div className="mx-auto max-w-[1200px] px-4 pb-6 pt-8 md:px-6 md:pb-8 md:pt-10">
          <h1 className="max-w-2xl text-balance text-headline-lg text-ink md:text-display">
            Espacios deportivos de tu comuna
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-body text-ink-soft">
            Consulta disponibilidad real y tarifas públicas. Reserva sin crear
            una cuenta y reporta daños en la infraestructura.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              icon={Building2}
              label="Espacios"
              value={isPending ? '—' : String(stats.total)}
              hint="En el catálogo municipal"
            />
            <StatCard
              icon={CalendarCheck}
              label="Operativos"
              value={isPending ? '—' : String(stats.active)}
              hint="Disponibles para reservar"
            />
            <StatCard
              icon={Users}
              label="Aforo sumado"
              value={isPending ? '—' : String(stats.capacity)}
              hint="Personas en espacios activos"
            />
            <StatCard
              icon={Wallet}
              label="Desde"
              value={
                isPending || stats.minPrice === null
                  ? '—'
                  : formatAmount(stats.minPrice)
              }
              hint="Tarifa base por bloque"
            />
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0"
            role="group"
            aria-label="Filtrar espacios por tipo"
          >
            {SPACE_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(value)}
                  className={cn(
                    'inline-flex min-h-12 shrink-0 items-center gap-2 rounded-pill border px-4 text-small font-medium transition-colors',
                    active
                      ? 'border-sky-700 bg-sky-700 text-white'
                      : 'border-border bg-surface text-ink-soft hover:border-sky-300 hover:text-ink',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>

          <p className="text-small text-ink-soft" role="status" aria-live="polite">
            {isPending
              ? 'Cargando espacios…'
              : `${filtered.length} ${filtered.length === 1 ? 'espacio' : 'espacios'} para ti`}
          </p>
        </div>

        <h2 className="sr-only">Resultados de espacios deportivos</h2>

        <div className="mt-5">
          {isPending ? <SpaceGridSkeleton /> : null}

          {errorCopy !== null ? (
            <InlineAlert
              tone={errorCopy.tone}
              title={errorCopy.title}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void refetch()}
                  loading={isFetching}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Reintentar
                </Button>
              }
            >
              {errorCopy.description}
            </InlineAlert>
          ) : null}

          {!isPending && errorCopy === null && filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={
                (spaces ?? []).length === 0
                  ? 'No hay espacios registrados'
                  : 'No hay espacios de este tipo en tu comuna'
              }
              description={
                (spaces ?? []).length === 0
                  ? 'El catálogo municipal está vacío en este momento. Vuelve a intentarlo en unos minutos.'
                  : 'Prueba con otro filtro o consulta todos los espacios disponibles.'
              }
              action={
                (spaces ?? []).length === 0 ? (
                  <Button variant="secondary" onClick={() => void refetch()}>
                    Reintentar
                  </Button>
                ) : (
                  <Button onClick={() => setFilter('ALL')}>Ver todos</Button>
                )
              }
            />
          ) : null}

          {!isPending && errorCopy === null && filtered.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((space) => (
                <SpaceCard key={space.id} space={space} />
              ))}
            </div>
          ) : null}
        </div>

        <aside className="mt-8 rounded-card border border-sky-200 bg-info-bg p-4 text-small text-info-text md:flex md:items-start md:gap-4">
          <ShieldCheck className="mb-2 h-6 w-6 shrink-0 md:mb-0" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Transparencia y beneficio ciudadano</h2>
            <p className="mt-1 text-pretty">
              Los espacios municipales aplican la tarifa pública por bloque. El
              Adulto Mayor recibe un beneficio del 50 % y los clubes privados un
              recargo solidario del 20 %, conforme a la ordenanza municipal
              vigente. El monto final lo confirma el servidor al reservar.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-3 shadow-card md:p-4">
      <dt className="flex items-center gap-2 text-caption font-medium uppercase tracking-wide text-ink-soft">
        <Icon className="h-4 w-4 text-sky-700" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 text-headline-sm font-semibold tabular-nums text-ink">
        {value}
      </dd>
      <dd className="mt-0.5 text-caption text-ink-muted" data-reading-hide>
        {hint}
      </dd>
    </div>
  );
}
