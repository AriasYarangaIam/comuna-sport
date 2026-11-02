import { ApiError, NetworkError } from './api';

export type ErrorTone = 'danger' | 'warning' | 'info';

export interface UserFacingError {
  code: string;
  title: string;
  description: string;
  tone: ErrorTone;
  retryable: boolean;
}

export type ErrorContext =
  | 'spaces'
  | 'availability'
  | 'reservation'
  | 'reservations'
  | 'incidents'
  | 'receipt';

const generic: UserFacingError = {
  code: 'UNKNOWN',
  title: 'Algo salió mal',
  description: 'No pudimos completar la operación. Intenta nuevamente.',
  tone: 'danger',
  retryable: true,
};

const network: UserFacingError = {
  code: 'NETWORK_ERROR',
  title: 'Sin conexión con el servidor',
  description:
    'Revisa tu conexión e inténtalo otra vez. Tu reserva no se registró.',
  tone: 'danger',
  retryable: true,
};

const contextCopy: Record<ErrorContext, { title: string; description: string }> = {
  spaces: {
    title: 'No pudimos cargar los espacios',
    description: 'El catálogo municipal no está disponible en este momento.',
  },
  availability: {
    title: 'No pudimos consultar la disponibilidad',
    description: 'Revisa la fecha y la duración, y vuelve a intentarlo.',
  },
  reservation: {
    title: 'No pudimos registrar tu reserva',
    description: 'Tu reserva no se cobró. Intenta nuevamente en un momento.',
  },
  reservations: {
    title: 'No pudimos cargar tus reservas',
    description: 'El historial no está disponible en este momento.',
  },
  incidents: {
    title: 'No pudimos cargar los reportes',
    description: 'La lista de incidentes no está disponible en este momento.',
  },
  receipt: {
    title: 'No pudimos cargar el recibo',
    description: 'El comprobante no está disponible en este momento.',
  },
};

/**
 * Traduce códigos de error del backend a mensajes para el ciudadano.
 * Nunca se muestra `error.message` (llega en inglés y con detalles internos).
 */
export const toUserFacingError = (
  error: unknown,
  context: ErrorContext = 'spaces',
): UserFacingError => {
  if (error instanceof NetworkError) {
    return network;
  }

  if (error instanceof ApiError) {
    const copy = contextCopy[context];

    switch (error.code) {
      case 'MISSING_IDEMPOTENCY_KEY':
        return {
          code: error.code,
          title: 'No pudimos preparar tu solicitud',
          description: 'Recarga la página e intenta reservar nuevamente.',
          tone: 'danger',
          retryable: true,
        };
      case 'RESERVATION_CONFLICT':
        return {
          code: error.code,
          title: 'Ese horario ya fue tomado',
          description:
            'Otro vecino reservó ese bloque hace un momento. Elige otro horario disponible.',
          tone: 'warning',
          retryable: false,
        };
      case 'IDEMPOTENCY_CONFLICT': {
        const details = error.details;
        const reason =
          typeof details === 'object' && details !== null && 'reason' in details
            ? String((details as { reason?: unknown }).reason)
            : '';
        if (reason === 'payload_mismatch') {
          return {
            code: error.code,
            title: 'Detectamos un cambio en los datos',
            description:
              'Renovamos tu operación. Revisa el resumen y confirma nuevamente.',
            tone: 'warning',
            retryable: false,
          };
        }
        return {
          code: error.code,
          title: 'Tu reserva ya se está procesando',
          description: 'Espera unos segundos; no cierres esta página.',
          tone: 'warning',
          retryable: false,
        };
      }
      case 'SPACE_NOT_FOUND':
        return {
          code: error.code,
          title:
            context === 'reservation'
              ? 'Ese espacio ya no está disponible'
              : 'No encontramos ese espacio',
          description:
            context === 'reservation'
              ? 'Puede haber pasado a mantenimiento. Vuelve al explorador para elegir otro.'
              : 'Puede haber cambiado de estado. Vuelve al explorador.',
          tone: 'warning',
          retryable: false,
        };
      case 'RESERVATION_NOT_FOUND':
      case 'INCIDENT_NOT_FOUND':
        return {
          code: error.code,
          title: 'No encontramos ese registro',
          description: 'Puede haber expirado o el enlace estar incompleto.',
          tone: 'warning',
          retryable: false,
        };
      case 'RATE_LIMIT_EXCEEDED':
        return {
          code: error.code,
          title: 'Hiciste muchas consultas seguidas',
          description: 'Espera unos minutos y vuelve a intentarlo.',
          tone: 'warning',
          retryable: false,
        };
      case 'INTERNAL_ERROR':
        return {
          code: error.code,
          title: 'Algo falló de nuestro lado',
          description: 'Tu reserva no se cobró. Reintenta en un momento.',
          tone: 'danger',
          retryable: true,
        };
      case 'BAD_REQUEST':
        return {
          code: error.code,
          title:
            context === 'availability'
              ? 'Revisa la fecha y la duración'
              : copy.title,
          description:
            context === 'availability'
              ? 'El inicio y el fin deben ser del mismo día, con la hora de fin después del inicio.'
              : copy.description,
          tone: context === 'availability' ? 'warning' : 'danger',
          retryable: context !== 'incidents',
        };
      case 'INVALID_RESPONSE':
        return {
          code: error.code,
          title: 'Recibimos una respuesta inesperada',
          description: 'Recarga la página e intenta nuevamente.',
          tone: 'danger',
          retryable: true,
        };
      default:
        return { ...copy, code: error.code, tone: 'danger', retryable: true };
    }
  }

  return generic;
};

export const isApiErrorCode = (error: unknown, code: string): boolean =>
  error instanceof ApiError && error.code === code;

export const isIdempotencyConflict = (
  error: unknown,
  reason: 'in_flight' | 'payload_mismatch',
): boolean => {
  if (!(error instanceof ApiError) || error.code !== 'IDEMPOTENCY_CONFLICT') {
    return false;
  }
  const details = error.details;
  return (
    typeof details === 'object' &&
    details !== null &&
    'reason' in details &&
    (details as { reason?: unknown }).reason === reason
  );
};
