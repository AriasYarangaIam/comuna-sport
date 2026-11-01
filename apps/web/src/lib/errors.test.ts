import { describe, expect, it } from 'vitest';
import { ApiError, NetworkError } from './api';
import { isApiErrorCode, isIdempotencyConflict, toUserFacingError } from './errors';

describe('toUserFacingError', () => {
  it('traduce el conflicto de horario sin mostrar el mensaje del backend', () => {
    const error = new ApiError(409, 'RESERVATION_CONFLICT', 'Slot already taken');
    const copy = toUserFacingError(error, 'reservation');
    expect(copy.title).toBe('Ese horario ya fue tomado');
    expect(copy.tone).toBe('warning');
    expect(copy.retryable).toBe(false);
    expect(JSON.stringify(copy)).not.toContain('Slot already taken');
  });

  it('distingue payload_mismatch de in_flight', () => {
    const mismatch = new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'conflict', {
      reason: 'payload_mismatch',
    });
    const inFlight = new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'conflict', {
      reason: 'in_flight',
    });

    expect(toUserFacingError(mismatch, 'reservation').title).toBe(
      'Detectamos un cambio en los datos',
    );
    expect(toUserFacingError(inFlight, 'reservation').title).toBe(
      'Tu reserva ya se está procesando',
    );
    expect(isIdempotencyConflict(mismatch, 'payload_mismatch')).toBe(true);
    expect(isIdempotencyConflict(inFlight, 'payload_mismatch')).toBe(false);
  });

  it('traduce un fallo de red como reintentable', () => {
    const copy = toUserFacingError(new NetworkError(), 'reservation');
    expect(copy.code).toBe('NETWORK_ERROR');
    expect(copy.retryable).toBe(true);
    expect(copy.description).toContain('Tu reserva no se registró');
  });

  it('usa el contexto para los errores no listados', () => {
    const copy = toUserFacingError(
      new ApiError(500, 'SOMETHING_NEW', 'internal'),
      'incidents',
    );
    expect(copy.title).toBe('No pudimos cargar los reportes');
    expect(copy.code).toBe('SOMETHING_NEW');
  });

  it('traduce códigos de recurso no encontrado y límite de peticiones', () => {
    expect(
      toUserFacingError(new ApiError(404, 'SPACE_NOT_FOUND', 'x'), 'reservation')
        .title,
    ).toBe('Ese espacio ya no está disponible');
    expect(
      toUserFacingError(new ApiError(404, 'RESERVATION_NOT_FOUND', 'x')).title,
    ).toBe('No encontramos ese registro');
    expect(
      toUserFacingError(new ApiError(429, 'RATE_LIMIT_EXCEEDED', 'x')).title,
    ).toBe('Hiciste muchas consultas seguidas');
  });

  it('marca BAD_REQUEST de disponibilidad como advertencia accionable', () => {
    const copy = toUserFacingError(
      new ApiError(400, 'BAD_REQUEST', 'invalid range'),
      'availability',
    );
    expect(copy.tone).toBe('warning');
    expect(copy.description).toContain('mismo día');
  });

  it('reconoce códigos con isApiErrorCode', () => {
    const error = new ApiError(404, 'SPACE_NOT_FOUND', 'x');
    expect(isApiErrorCode(error, 'SPACE_NOT_FOUND')).toBe(true);
    expect(isApiErrorCode(new Error('x'), 'SPACE_NOT_FOUND')).toBe(false);
  });

  it('cae en el mensaje genérico para errores desconocidos', () => {
    expect(toUserFacingError(new Error('boom')).code).toBe('UNKNOWN');
  });
});
