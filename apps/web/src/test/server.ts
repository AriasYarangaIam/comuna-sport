import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReservationBody } from '../types/api';
import { makeIncident, makeReservation, spacesFixture } from './fixtures';

export interface CapturedReservationRequest {
  spaceId: string;
  idempotencyKey: string | null;
  body: ReservationBody;
}

export const captured = {
  reservationRequests: [] as CapturedReservationRequest[],
  incidentRequests: [] as unknown[],
};

export const resetCaptured = (): void => {
  captured.reservationRequests = [];
  captured.incidentRequests = [];
};

const jsonError = (
  status: number,
  code: string,
  details?: unknown,
): Response =>
  HttpResponse.json(
    { error: { code, message: `Backend message for ${code}`, details } },
    { status },
  );

export const handlers = [
  http.get('*/api/spaces', () => HttpResponse.json(spacesFixture)),

  // Debe declararse antes que `/spaces/:spaceId` porque MSW respeta el orden.
  http.get('*/api/spaces/availability', () =>
    HttpResponse.json(spacesFixture.filter((space) => space.isActive)),
  ),

  http.get('*/api/spaces/:spaceId', ({ params }) => {
    const space = spacesFixture.find(
      (candidate) => candidate.id === params.spaceId,
    );
    return space === undefined
      ? jsonError(404, 'SPACE_NOT_FOUND')
      : HttpResponse.json(space);
  }),

  http.post(
    '*/api/spaces/:spaceId/reservations',
    async ({ params, request }) => {
      const body = (await request.json()) as ReservationBody;
      captured.reservationRequests.push({
        spaceId: String(params.spaceId),
        idempotencyKey: request.headers.get('Idempotency-Key'),
        body,
      });
      return HttpResponse.json(
        makeReservation({
          id: `reservation-${captured.reservationRequests.length}`,
          spaceId: String(params.spaceId),
          userId: body.userId,
          role: body.role,
          timeSlot: body.timeSlot,
          cost: {
            amount:
              body.role === 'SENIOR'
                ? 60
                : body.role === 'PRIVATE_CLUB'
                  ? 144
                  : 120,
            currency: 'PEN',
          },
        }),
        { status: 201 },
      );
    },
  ),

  http.get('*/api/reservations/:reservationId', ({ params }) =>
    HttpResponse.json(makeReservation({ id: String(params.reservationId) })),
  ),

  http.get('*/api/users/:userId/reservations', () => HttpResponse.json([])),

  http.get('*/api/spaces/:spaceId/incidents', () =>
    HttpResponse.json([makeIncident()]),
  ),

  http.post('*/api/incidents', async ({ request }) => {
    const body = (await request.json()) as {
      spaceId: string;
      reporterId: string;
      description: string;
    };
    captured.incidentRequests.push(body);
    return HttpResponse.json(
      makeIncident({
        id: 'incident-new',
        spaceId: body.spaceId,
        reporterId: body.reporterId,
        description: body.description,
      }),
      { status: 201 },
    );
  }),

  http.get('*/api/incidents/:incidentId', ({ params }) =>
    HttpResponse.json(makeIncident({ id: String(params.incidentId) })),
  ),
];

export const server = setupServer(...handlers);
