import { z } from 'zod';
import {
  apiErrorSchema,
  incidentListSchema,
  incidentSchema,
  reservationListSchema,
  reservationSchema,
  spaceListSchema,
  spaceSchema,
} from './schemas';
import type {
  IncidentBody,
  IncidentDto,
  ReservationBody,
  ReservationDto,
  SpaceDto,
} from '../types/api';

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

/** Error HTTP con el código de dominio del backend (nunca su mensaje técnico). */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: unknown;

  public constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** `fetch` rechazado: no hay respuesta del servidor. */
export class NetworkError extends Error {
  public constructor() {
    super('No se pudo conectar con el servidor.');
    this.name = 'NetworkError';
  }
}

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (text.trim() === '') {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const request = async <T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(init?.headers ?? {}),
      },
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new NetworkError();
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(payload);
    if (parsed.success) {
      throw new ApiError(
        response.status,
        parsed.data.error.code,
        parsed.data.error.message,
        parsed.data.error.details,
      );
    }
    throw new ApiError(
      response.status,
      `HTTP_${response.status}`,
      response.statusText || 'Unexpected error',
    );
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(
      response.status,
      'INVALID_RESPONSE',
      'La respuesta del servidor no tiene el formato esperado.',
      parsed.error.flatten(),
    );
  }
  return parsed.data;
};

const availabilityQuery = (start: string, end: string): string => {
  const params = new URLSearchParams({ start, end });
  return params.toString();
};

export const api = {
  getSpaces: (signal?: AbortSignal): Promise<SpaceDto[]> =>
    request('/spaces', spaceListSchema, { signal }),

  getSpace: (spaceId: string, signal?: AbortSignal): Promise<SpaceDto> =>
    request(`/spaces/${encodeURIComponent(spaceId)}`, spaceSchema, { signal }),

  getAvailability: (
    start: string,
    end: string,
    signal?: AbortSignal,
  ): Promise<SpaceDto[]> =>
    request(
      `/spaces/availability?${availabilityQuery(start, end)}`,
      spaceListSchema,
      { signal },
    ),

  createReservation: (
    spaceId: string,
    body: ReservationBody,
    idempotencyKey: string,
  ): Promise<ReservationDto> =>
    request(`/spaces/${encodeURIComponent(spaceId)}/reservations`, reservationSchema, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    }),

  getReservation: (
    reservationId: string,
    signal?: AbortSignal,
  ): Promise<ReservationDto> =>
    request(
      `/reservations/${encodeURIComponent(reservationId)}`,
      reservationSchema,
      { signal },
    ),

  getUserReservations: (
    userId: string,
    signal?: AbortSignal,
  ): Promise<ReservationDto[]> =>
    request(
      `/users/${encodeURIComponent(userId)}/reservations`,
      reservationListSchema,
      { signal },
    ),

  createIncident: (body: IncidentBody): Promise<IncidentDto> =>
    request('/incidents', incidentSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getIncident: (incidentId: string, signal?: AbortSignal): Promise<IncidentDto> =>
    request(`/incidents/${encodeURIComponent(incidentId)}`, incidentSchema, {
      signal,
    }),

  getSpaceIncidents: (
    spaceId: string,
    signal?: AbortSignal,
  ): Promise<IncidentDto[]> =>
    request(
      `/spaces/${encodeURIComponent(spaceId)}/incidents`,
      incidentListSchema,
      { signal },
    ),
};
