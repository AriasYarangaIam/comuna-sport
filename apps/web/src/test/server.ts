import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReservationBody } from '../types/api';
import { makeIncident, makeReservation, spacesFixture } from './fixtures';

export interface CapturedReservationRequest {
  spaceSlug: string;
  idempotencyKey: string | null;
  body: ReservationBody;
}

export const captured = {
  reservationRequests: [] as CapturedReservationRequest[],
  incidentRequests: [] as unknown[],
  incidentPatches: [] as { incidentId: string; state: string; authorization: string | null }[],
  cancelledReservations: [] as string[],
};

export const resetCaptured = (): void => {
  captured.reservationRequests = [];
  captured.incidentRequests = [];
  captured.incidentPatches = [];
  captured.cancelledReservations = [];
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

  // Debe declararse antes que `/spaces/:spaceSlug` porque MSW respeta el orden.
  http.get('*/api/spaces/availability', () =>
    HttpResponse.json(spacesFixture.filter((space) => space.isActive)),
  ),

  http.get('*/api/spaces/:spaceSlug', ({ params }) => {
    const space = spacesFixture.find(
      (candidate) => candidate.slug === params.spaceSlug,
    );
    return space === undefined
      ? jsonError(404, 'SPACE_NOT_FOUND')
      : HttpResponse.json(space);
  }),

  http.post(
    '*/api/spaces/:spaceSlug/reservations',
    async ({ params, request }) => {
      const body = (await request.json()) as ReservationBody;
      captured.reservationRequests.push({
        spaceSlug: String(params.spaceSlug),
        idempotencyKey: request.headers.get('Idempotency-Key'),
        body,
      });
      return HttpResponse.json(
        makeReservation({
          id: `reservation-${captured.reservationRequests.length}`,
          spaceSlug: String(params.spaceSlug),
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

  http.delete('*/api/reservations/:reservationId', ({ params }) => {
    captured.cancelledReservations.push(String(params.reservationId));
    return HttpResponse.json(
      makeReservation({ id: String(params.reservationId), isActive: false }),
    );
  }),

  http.get('*/api/users/:dni/reservations', () => HttpResponse.json([])),

  http.get('*/api/spaces/:spaceSlug/incidents', () =>
    HttpResponse.json([makeIncident()]),
  ),

  http.post('*/api/incidents', async ({ request }) => {
    const body = (await request.json()) as {
      spaceSlug: string;
      dni: string;
      description: string;
    };
    captured.incidentRequests.push(body);
    return HttpResponse.json(
      makeIncident({
        id: 'incident-new',
        spaceSlug: body.spaceSlug,
        description: body.description,
      }),
      { status: 201 },
    );
  }),

  http.get('*/api/incidents/:incidentId', ({ params }) =>
    HttpResponse.json(makeIncident({ id: String(params.incidentId) })),
  ),

  // S1 (odd/tasks/demo-completion.md): the municipal lifecycle action.
  http.patch('*/api/incidents/:incidentId', async ({ params, request }) => {
    const body = (await request.json()) as { state: 'APPROVED' | 'REJECTED' | 'RESOLVED' };
    captured.incidentPatches.push({
      incidentId: String(params.incidentId),
      state: body.state,
      authorization: request.headers.get('Authorization'),
    });
    return HttpResponse.json(
      makeIncident({
        id: String(params.incidentId),
        state: body.state,
        resolvedAt: body.state === 'RESOLVED' ? new Date().toISOString() : null,
      }),
    );
  }),
];

export const server = setupServer(...handlers);
