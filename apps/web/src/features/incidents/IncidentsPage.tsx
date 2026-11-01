import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  SearchX,
  Send,
  Wrench,
} from 'lucide-react';
import type { IncidentDto } from '../../types/api';
import {
  useCreateIncident,
  useSpaceIncidents,
  useSpaces,
} from '../../hooks/useComunaSport';
import { toUserFacingError, type UserFacingError } from '../../lib/errors';
import { formatDateTime } from '../../lib/datetime';
import { useUiStore } from '../../stores/ui';
import { cn } from '../../lib/cn';
import { Button } from '../../components/ui/Button';
import { InlineAlert } from '../../components/ui/InlineAlert';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { Select, TextArea, TextInput } from '../../components/ui/Input';
import { IncidentTimeline } from '../../components/domain/IncidentTimeline';
import { IncidentStatusBadge } from '../../components/domain/StatusBadge';

interface IncidentErrors {
  spaceId?: string;
  reporterId?: string;
  description?: string;
}

const shortCode = (id: string): string =>
  id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;

export function IncidentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lastReporterId = useUiStore((state) => state.lastReporterId);
  const setLastReporterId = useUiStore((state) => state.setLastReporterId);

  const {
    data: spaces,
    isPending: spacesPending,
    isError: spacesError,
    error: spacesErrorObject,
    refetch: refetchSpaces,
    isFetching: spacesFetching,
  } = useSpaces();

  const querySpaceId = searchParams.get('spaceId') ?? '';
  const [spaceId, setSpaceId] = useState(querySpaceId);
  const [reporterId, setReporterId] = useState(lastReporterId);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<IncidentErrors>({});
  const [serverError, setServerError] = useState<UserFacingError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [newIncidentId, setNewIncidentId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const initialisedSpace = useRef(false);

  const selectedSpace = useMemo(
    () => (spaces ?? []).find((space) => space.id === spaceId),
    [spaces, spaceId],
  );

  useEffect(() => {
    if (spacesPending || spaces === undefined || initialisedSpace.current) {
      return;
    }
    const fromQuery = spaces.find((space) => space.id === querySpaceId);
    const fallback = spaces.find((space) => space.isActive) ?? spaces[0];
    setSpaceId(fromQuery?.id ?? fallback?.id ?? '');
    initialisedSpace.current = true;
  }, [spacesPending, spaces, querySpaceId]);

  const {
    data: incidents,
    isPending: incidentsPending,
    isError: incidentsError,
    error: incidentsErrorObject,
    refetch: refetchIncidents,
    isFetching: incidentsFetching,
  } = useSpaceIncidents(spaceId);

  const mutation = useCreateIncident();

  useEffect(() => {
    if (incidents === undefined) {
      return;
    }
    if (
      selectedIncidentId === null ||
      !incidents.some((incident) => incident.id === selectedIncidentId)
    ) {
      setSelectedIncidentId(incidents[0]?.id ?? null);
    }
  }, [incidents, selectedIncidentId]);

  useEffect(() => {
    if (newIncidentId === null) {
      return;
    }
    const element = document.getElementById(`incident-${newIncidentId}`);
    element?.focus();
  }, [newIncidentId, incidents]);

  const selectedIncident =
    (incidents ?? []).find((incident) => incident.id === selectedIncidentId) ??
    null;

  const spacesCopy = spacesError
    ? toUserFacingError(spacesErrorObject, 'spaces')
    : null;
  const incidentsCopy = incidentsError
    ? toUserFacingError(incidentsErrorObject, 'incidents')
    : null;

  const validate = (): boolean => {
    const next: IncidentErrors = {};
    if (spaceId === '') {
      next.spaceId = 'Selecciona el espacio afectado.';
    }
    if (reporterId.trim() === '') {
      next.reporterId = 'Ingresa tu identificador.';
    }
    const trimmedDescription = description.trim();
    if (trimmedDescription === '') {
      next.description = 'Describe el daño que encontraste.';
    } else if (trimmedDescription.length > 2000) {
      next.description = 'La descripción no puede superar los 2000 caracteres.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      window.requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus();
      });
      return false;
    }
    return true;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!validate() || selectedSpace === undefined) {
      return;
    }
    if (!selectedSpace.isActive) {
      setServerError({
        code: 'INACTIVE_SPACE',
        title: 'Este espacio está fuera de servicio',
        description:
          'No admite reportes en este momento. Elige un espacio activo.',
        tone: 'warning',
        retryable: false,
      });
      return;
    }
    setServerError(null);
    setSuccessMessage(null);
    setLastReporterId(reporterId.trim());
    mutation.mutate(
      {
        spaceId: selectedSpace.id,
        reporterId: reporterId.trim(),
        description: description.trim(),
      },
      {
        onSuccess: (incident: IncidentDto) => {
          setDescription('');
          setSuccessMessage(
            'Reporte enviado. El municipio lo revisará y actualizará su estado.',
          );
          setNewIncidentId(incident.id);
          setSelectedIncidentId(incident.id);
          setSearchParams({ spaceId: incident.spaceId });
        },
        onError: (error: unknown) => {
          setServerError(toUserFacingError(error, 'incidents'));
        },
      },
    );
  };

  if (spacesPending) {
    return <ListSkeleton rows={3} />;
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-6 md:py-8">
      <header>
        <h1 className="text-headline-lg text-ink md:text-display">
          Incidentes comunitarios
        </h1>
        <p className="mt-2 max-w-2xl text-pretty text-body text-ink-soft">
          Reporta daños en la infraestructura deportiva y sigue el estado de tu
          reporte. La gestión la realiza el municipio.
        </p>
      </header>

      {spacesCopy !== null ? (
        <div className="mt-5">
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
        </div>
      ) : null}

      {spacesCopy === null && (spaces ?? []).length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Wrench}
            title="No hay espacios para reportar"
            description="El catálogo municipal está vacío en este momento. Vuelve a intentarlo más tarde."
            action={
              <Button variant="secondary" onClick={() => void refetchSpaces()}>
                Reintentar
              </Button>
            }
          />
        </div>
      ) : null}

      {spacesCopy === null && (spaces ?? []).length > 0 ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section
            aria-labelledby="reportar-titulo"
            className="rounded-card border border-border bg-surface p-4 shadow-card md:p-5"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="reportar-titulo" className="text-headline-sm text-ink">
                  Reportar un daño
                </h2>
                <p className="text-small text-ink-soft">
                  Toma menos de un minuto.
                </p>
              </div>
            </div>

            {selectedSpace !== undefined && !selectedSpace.isActive ? (
              <div className="mt-4">
                <InlineAlert tone="warning" title="Espacio en mantenimiento">
                  Este espacio no recibe reportes mientras esté fuera de
                  servicio. Elige otro espacio activo.
                </InlineAlert>
              </div>
            ) : null}

            <form
              ref={formRef}
              onSubmit={handleSubmit}
              noValidate
              className="mt-4 space-y-4"
            >
              <Select
                id="incident-space"
                label="Espacio afectado"
                value={spaceId}
                onChange={(event) => {
                  const nextSpaceId = event.target.value;
                  setSpaceId(nextSpaceId);
                  setSearchParams({ spaceId: nextSpaceId });
                  setErrors((current) => ({ ...current, spaceId: undefined }));
                }}
                error={errors.spaceId}
                required
              >
                <option value="">Selecciona un espacio</option>
                {(spaces ?? []).map((space) => (
                  <option
                    key={space.id}
                    value={space.id}
                    disabled={!space.isActive}
                  >
                    {space.name}
                    {space.isActive ? '' : ' (en mantenimiento)'}
                  </option>
                ))}
              </Select>

              <TextInput
                id="incident-reporter"
                label="Tu identificador"
                value={reporterId}
                onChange={(event) => {
                  setReporterId(event.target.value);
                  setErrors((current) => ({
                    ...current,
                    reporterId: undefined,
                  }));
                }}
                placeholder="vecino-auditor-01"
                hint="No es una cuenta: identifica quién reporta el daño."
                error={errors.reporterId}
                autoComplete="username"
                required
              />

              <TextArea
                id="incident-description"
                label="¿Qué pasó?"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setErrors((current) => ({
                    ...current,
                    description: undefined,
                  }));
                }}
                placeholder="Tablero de básquet con fisura en el soporte norte…"
                hint="Describe el daño y, si puedes, ubícalo dentro del espacio."
                error={errors.description}
                maxLength={2000}
                showCount
                required
              />

              {serverError !== null ? (
                <InlineAlert
                  tone={serverError.tone}
                  title={serverError.title}
                >
                  {serverError.description}
                </InlineAlert>
              ) : null}

              {successMessage !== null ? (
                <InlineAlert tone="success" title="Reporte enviado">
                  {successMessage}
                </InlineAlert>
              ) : null}

              <Button
                type="submit"
                loading={mutation.isPending}
                loadingLabel="Enviando reporte…"
                fullWidth
                disabled={
                  selectedSpace !== undefined && !selectedSpace.isActive
                }
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Enviar reporte
              </Button>
            </form>
          </section>

          <section aria-labelledby="seguimiento-titulo" className="min-w-0">
            <div className="rounded-card border border-border bg-surface p-4 shadow-card md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="seguimiento-titulo" className="text-headline-sm text-ink">
                    Seguimiento
                  </h2>
                  <p className="mt-1 text-small text-ink-soft">
                    {selectedSpace?.name ?? 'Selecciona un espacio'}
                  </p>
                </div>
                {selectedIncident !== null ? (
                  <IncidentStatusBadge state={selectedIncident.state} />
                ) : null}
              </div>

              <div className="mt-4">
                {selectedIncident === null ? (
                  <p className="text-small text-ink-soft">
                    Cuando envíes un reporte, aquí verás su ciclo de vida.
                  </p>
                ) : (
                  <IncidentTimeline
                    state={selectedIncident.state}
                    createdAt={formatDateTime(selectedIncident.createdAt)}
                    resolvedAt={
                      selectedIncident.resolvedAt === null
                        ? null
                        : formatDateTime(selectedIncident.resolvedAt)
                    }
                  />
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <h3 className="text-headline-sm text-ink">
                Reportes de este espacio
              </h3>
              {incidentsFetching ? (
                <span className="text-small text-ink-soft" role="status">
                  Actualizando…
                </span>
              ) : null}
            </div>

            <div className="mt-3">
              {incidentsPending ? <ListSkeleton rows={2} /> : null}

              {incidentsCopy !== null ? (
                <InlineAlert
                  tone={incidentsCopy.tone}
                  title={incidentsCopy.title}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void refetchIncidents()}
                      loading={incidentsFetching}
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      Reintentar
                    </Button>
                  }
                >
                  {incidentsCopy.description}
                </InlineAlert>
              ) : null}

              {!incidentsPending &&
              incidentsCopy === null &&
              (incidents ?? []).length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="Sin reportes para este espacio"
                  description="Sé el primero en reportar un daño. El municipio revisará tu reporte y actualizará su estado."
                />
              ) : null}

              {!incidentsPending &&
              incidentsCopy === null &&
              (incidents ?? []).length > 0 ? (
                <ul className="space-y-2">
                  {(incidents ?? []).map((incident) => {
                    const active = incident.id === selectedIncidentId;
                    return (
                      <li key={incident.id}>
                        <button
                          type="button"
                          id={`incident-${incident.id}`}
                          aria-pressed={active}
                          onClick={() => setSelectedIncidentId(incident.id)}
                          className={cn(
                            'w-full rounded-card border p-3 text-left transition-colors',
                            active
                              ? 'border-sky-700 bg-sky-50'
                              : 'border-border bg-surface hover:border-sky-300 hover:bg-sky-50/50',
                            incident.id === newIncidentId && 'animate-card-in',
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-caption text-ink-soft">
                              #{shortCode(incident.id)}
                            </span>
                            <IncidentStatusBadge state={incident.state} />
                          </div>
                          <p className="mt-2 line-clamp-2 text-small text-ink">
                            {incident.description}
                          </p>
                          <p className="mt-1 text-caption text-ink-muted">
                            Reportó {incident.reporterId} ·{' '}
                            {formatDateTime(incident.createdAt)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              <p className="mt-3 flex gap-2 text-caption text-ink-soft">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
                La API no expone cambios de estado: el seguimiento es de solo
                lectura y lo actualiza el municipio.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
