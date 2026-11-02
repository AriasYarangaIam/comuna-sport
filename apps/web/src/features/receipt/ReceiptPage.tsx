import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarX, RefreshCw } from 'lucide-react';
import {
  useReservation,
  useSpace,
} from '../../hooks/useComunaSport';
import { toUserFacingError } from '../../lib/errors';
import { ApiError } from '../../lib/api';
import { buttonStyles, Button } from '../../components/ui/Button';
import { InlineAlert } from '../../components/ui/InlineAlert';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSkeleton } from '../../components/ui/Skeleton';
import { ReservationReceipt } from '../../components/domain/ReservationReceipt';

export function ReceiptPage() {
  const { reservationId = '' } = useParams<{ reservationId: string }>();
  const {
    data: reservation,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useReservation(reservationId);
  const { data: space, isPending: spacePending } = useSpace(
    reservation?.spaceId,
  );

  if (isPending) {
    return <PageSkeleton />;
  }

  if (isError) {
    const copy = toUserFacingError(error, 'receipt');
    const notFound =
      error instanceof ApiError && error.code === 'RESERVATION_NOT_FOUND';
    return (
      <div className="mx-auto max-w-[680px] px-4 py-10 md:px-6">
        <h1 className="text-headline-lg text-ink">Reserva confirmada</h1>
        <div className="mt-4">
          {notFound ? (
            <EmptyState
              icon={CalendarX}
              title="No encontramos ese comprobante"
              description="Puede haber expirado o el enlace estar incompleto. Consulta tus reservas con tu identificador."
              action={
                <Link to="/mis-reservas" className={buttonStyles()}>
                  Ir a mis reservas
                </Link>
              }
            />
          ) : (
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
          )}
        </div>
      </div>
    );
  }

  if (reservation === undefined) {
    return (
      <div className="mx-auto max-w-[680px] px-4 py-10 md:px-6">
        <h1 className="text-headline-lg text-ink">Reserva confirmada</h1>
        <EmptyState
          icon={CalendarX}
          title="No encontramos ese comprobante"
          description="El enlace puede estar incompleto."
          action={
            <Link to="/mis-reservas" className={buttonStyles()}>
              Ir a mis reservas
            </Link>
          }
        />
      </div>
    );
  }

  if (spacePending) {
    return <PageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[680px] px-4 py-6 md:px-6 md:py-8">
      <Link
        to="/"
        className="inline-flex min-h-12 items-center gap-2 rounded-control text-small font-medium text-sky-800 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver al explorador
      </Link>

      <header className="mt-3 text-center">
        <h1 className="text-headline-lg text-ink md:text-display">
          Reserva confirmada
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-pretty text-body text-ink-soft">
          Tu solicitud quedó registrada y el municipio validará el uso del
          espacio. Guarda el código para cualquier consulta.
        </p>
      </header>

      <div className="mt-6">
        <ReservationReceipt
          reservation={reservation}
          space={space}
          actions={
            <>
              <Link
                to={`/mis-reservas?userId=${encodeURIComponent(reservation.userId)}`}
                className={buttonStyles({ variant: 'secondary' })}
              >
                Ver mis reservas
              </Link>
              <Link
                to={`/disponibilidad?spaceId=${encodeURIComponent(reservation.spaceId)}`}
                className={buttonStyles()}
              >
                Reservar otro horario
              </Link>
            </>
          }
        />
      </div>

      <p className="mt-4 text-center text-small text-ink-soft">
        ¿Necesitas ayuda con tu reserva? Consulta la sección de{' '}
        <Link to="/ayuda" className="font-medium text-sky-800 underline">
          Ayuda
        </Link>
        .
      </p>
    </div>
  );
}
