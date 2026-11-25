import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ClipboardList, KeyRound, Loader2, ShieldCheck, Wrench, XCircle } from 'lucide-react';
import type { AssignableIncidentState, IncidentDto } from '../../types/api';
import { useChangeIncidentState, useSpaceIncidents, useSpaces } from '../../hooks/useComunaSport';
import { ApiError } from '../../lib/api';
import { formatDateTime } from '../../lib/datetime';
import { Button, buttonStyles } from '../../components/ui/Button';
import { InlineAlert } from '../../components/ui/InlineAlert';
import { Select, TextInput } from '../../components/ui/Input';
import { PageSkeleton } from '../../components/ui/Skeleton';
import { IncidentStatusBadge } from '../../components/domain/StatusBadge';

// S2 (odd/tasks/demo-completion.md): the municipal management surface. There is
// no user system in this scope, so the operator proves authorisation with the
// ADMIN_TOKEN code, kept in sessionStorage for the browser session only. The
// citizen-facing screens never expose these actions.
const TOKEN_STORAGE_KEY = 'comunasport-admin-token';

const readStoredToken = (): string => {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

const storeToken = (token: string): void => {
  try {
    if (token === '') {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Private-mode storage failures must not block the screen.
  }
};

interface ActionDefinition {
  readonly state: AssignableIncidentState;
  readonly label: string;
  readonly variant: 'primary' | 'secondary' | 'danger';
}

// Only the transitions the state machine accepts are offered, so the operator
// never triggers a 422 by clicking.
const actionsFor = (state: IncidentDto['state']): readonly ActionDefinition[] => {
  if (state === 'UNDER_REVIEW') {
    return [
      { state: 'APPROVED', label: 'Aprobar', variant: 'primary' },
      { state: 'REJECTED', label: 'Rechazar', variant: 'danger' },
    ];
  }
  if (state === 'APPROVED') {
    return [{ state: 'RESOLVED', label: 'Marcar como resuelto', variant: 'primary' }];
  }
  return [];
};

const credentialMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.code === 'UNAUTHORIZED') {
      return 'El código de gestión no es válido. Verifícalo e inténtalo otra vez.';
    }
    if (error.code === 'STATE_TRANSITION_INVALID') {
      return 'Ese incidente ya fue cerrado; su estado no puede cambiar.';
    }
    if (error.code === 'INCIDENT_NOT_FOUND') {
      return 'Ese reporte ya no está disponible. Actualiza la lista.';
    }
    if (error.code === 'HTTP_404') {
      return 'La gestión municipal no está habilitada en este entorno.';
    }
  }
  return 'No pudimos completar la acción. Inténtalo de nuevo en un momento.';
};

export function GestionPage() {
  const [token, setToken] = useState<string>(readStoredToken);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState<string | undefined>(undefined);
  const [spaceSlug, setSpaceSlug] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);

  const {
    data: spaces,
    isPending: spacesPending,
    isError: spacesError,
    refetch: refetchSpaces,
  } = useSpaces();

  const activeSpaces = useMemo(() => spaces ?? [], [spaces]);

  useEffect(() => {
    if (spaceSlug !== '' || activeSpaces.length === 0) {
      return;
    }
    const fallback = activeSpaces.find((space) => space.isActive) ?? activeSpaces[0];
    if (fallback !== undefined) {
      setSpaceSlug(fallback.slug);
    }
  }, [activeSpaces, spaceSlug]);

  const {
    data: incidents,
    isPending: incidentsPending,
    isError: incidentsError,
    refetch: refetchIncidents,
  } = useSpaceIncidents(token === '' ? undefined : spaceSlug);

  const mutation = useChangeIncidentState();

  const handleTokenSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = tokenInput.trim();
    if (trimmed === '') {
      setTokenError('Ingresa el código de gestión.');
      return;
    }
    setTokenError(undefined);
    storeToken(trimmed);
    setToken(trimmed);
    setTokenInput('');
  };

  const handleSignOut = (): void => {
    storeToken('');
    setToken('');
    setFeedback(null);
  };

  const applyTransition = (incident: IncidentDto, state: AssignableIncidentState): void => {
    setFeedback(null);
    mutation.mutate(
      { incidentId: incident.id, state: state, token: token },
      {
        onSuccess: () => {
          setFeedback({
            tone: 'success',
            message:
              state === 'APPROVED'
                ? 'Reporte aprobado. El ciudadano verá el nuevo estado.'
                : state === 'REJECTED'
                  ? 'Reporte rechazado. El ciclo queda cerrado.'
                  : 'Reporte marcado como resuelto.',
          });
          void refetchIncidents();
        },
        onError: (error: unknown) => {
          const message = credentialMessage(error);
          if (error instanceof ApiError && error.code === 'UNAUTHORIZED') {
            // The code stopped being valid: drop the session and carry the
            // credential error into the code form, so the operator is told why.
            storeToken('');
            setToken('');
            setTokenError(message);
            setFeedback(null);
            return;
          }
          setFeedback({ tone: 'danger', message: message });
        },
      },
    );
  };

  if (token === '') {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-10 md:px-6">
        <header>
          <h1 className="text-headline-lg text-ink">Gestión municipal</h1>
          <p className="mt-2 text-pretty text-body text-ink-soft">
            Área reservada al municipio para revisar y cerrar los reportes de
            daño. Ingresa el código de gestión para continuar.
          </p>
        </header>

        <form
          onSubmit={handleTokenSubmit}
          className="mt-6 rounded-card border border-border bg-surface p-5 shadow-card"
          noValidate
        >
          <TextInput
            id="gestion-code"
            label="Código de gestión"
            type="password"
            value={tokenInput}
            onChange={(event) => {
              setTokenInput(event.target.value);
              setTokenError(undefined);
            }}
            placeholder="••••••••"
            hint="Lo entrega la municipalidad. Se guarda solo en esta sesión del navegador."
            error={tokenError}
            autoComplete="off"
            required
          />
          <div className="mt-4 flex items-center gap-3">
            <Button type="submit">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Entrar
            </Button>
            <Link to="/" className={buttonStyles({ variant: 'ghost' })}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver al inicio
            </Link>
          </div>
        </form>

        <p className="mt-4 text-caption text-ink-soft">
          Esta pantalla no expone datos personales: solo el estado de cada reporte
          y las acciones permitidas.
        </p>
      </div>
    );
  }

  if (spacesPending) {
    return <PageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[1040px] px-4 py-6 md:px-6 md:py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-headline-lg text-ink md:text-display">
            <ShieldCheck className="h-6 w-6 text-sky-700" aria-hidden="true" />
            Gestión municipal
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-body text-ink-soft">
            Revisa los reportes de daño y ciérralos. Cada cambio queda visible de
            inmediato en la ficha pública del incidente.
          </p>
        </div>
        <Button variant="ghost" onClick={handleSignOut}>
          Salir de gestión
        </Button>
      </header>

      {feedback !== null ? (
        <div className="mt-4" role="status" aria-live="polite">
          <InlineAlert
            tone={feedback.tone === 'success' ? 'success' : 'danger'}
            title={feedback.tone === 'success' ? 'Acción completada' : 'No se pudo completar'}
          >
            {feedback.message}
          </InlineAlert>
        </div>
      ) : null}

      {spacesError || incidentsError ? (
        <div className="mt-4">
          <InlineAlert tone="warning" title="No pudimos cargar los reportes">
            Revisa tu conexión e inténtalo de nuevo.
            <button
              type="button"
              onClick={() => {
                void refetchSpaces();
                void refetchIncidents();
              }}
              className="ml-1 underline"
            >
              Reintentar
            </button>
          </InlineAlert>
        </div>
      ) : null}

      <div className="mt-5 max-w-md">
        <Select
          id="gestion-space"
          label="Espacio afectado"
          value={spaceSlug}
          onChange={(event) => {
            setSpaceSlug(event.target.value);
            setFeedback(null);
          }}
        >
          {activeSpaces.map((space) => (
            <option key={space.slug} value={space.slug}>
              {space.name}
              {space.isActive ? '' : ' (en mantenimiento)'}
            </option>
          ))}
        </Select>
      </div>

      <section className="mt-6" aria-labelledby="gestion-lista">
        <h2 id="gestion-lista" className="flex items-center gap-2 text-headline-sm text-ink">
          <ClipboardList className="h-5 w-5 text-sky-700" aria-hidden="true" />
          Reportes del espacio
        </h2>

        {incidentsPending ? (
          <p className="mt-3 flex items-center gap-2 text-small text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando reportes…
          </p>
        ) : (incidents ?? []).length === 0 ? (
          <div className="mt-3">
            <InlineAlert tone="info" title="Sin reportes">
              Este espacio no tiene reportes de daño registrados.
            </InlineAlert>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {(incidents ?? []).map((incident: IncidentDto) => {
              const actions = actionsFor(incident.state);
              return (
                <li
                  key={incident.id}
                  className="rounded-card border border-border bg-surface p-4 shadow-card"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <IncidentStatusBadge state={incident.state} />
                    <span className="text-caption text-ink-soft">
                      {formatDateTime(incident.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-small text-ink">{incident.description}</p>
                  <p className="mt-1 font-mono text-caption text-ink-soft">#{incident.id.slice(0, 8)}</p>

                  {actions.length === 0 ? (
                    <p className="mt-3 flex items-center gap-2 text-caption text-ink-soft">
                      <CheckCircle2 className="h-4 w-4 text-success-text" aria-hidden="true" />
                      Ciclo cerrado: este reporte no admite más cambios.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {actions.map((action) => (
                        <Button
                          key={action.state}
                          variant={action.variant}
                          size="sm"
                          loading={mutation.isPending}
                          onClick={() => applyTransition(incident, action.state)}
                        >
                          {action.state === 'REJECTED' ? (
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                          ) : action.state === 'RESOLVED' ? (
                            <Wrench className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          )}
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-6 text-caption text-ink-soft">
        Las acciones se envían con el código de esta sesión. Si el código deja de
        ser válido, la pantalla te pedirá uno nuevo.
      </p>
    </div>
  );
}
