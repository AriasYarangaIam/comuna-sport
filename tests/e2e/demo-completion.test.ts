/// <reference types="node" />
/// <reference types="jest" />

import { randomUUID } from "crypto";

import { buildContainer } from "../../src/infrastructure/di/container";
import { createApp } from "../../src/main";
import request from "supertest";
import type { Response as SuperTestResponse } from "supertest";

// Demo-completion contract (odd/tasks/demo-completion.md):
// S1 incident lifecycle over HTTP, S3 rolling catalog horizon, S4 cancellation.

interface ErrorBody {
    readonly error: { readonly code: string; readonly message: string; readonly details?: unknown };
}

interface IncidentBody {
    readonly id?: string;
    readonly spaceSlug?: string;
    readonly state?: string;
    readonly resolvedAt?: string | null;
    readonly description?: string;
}

interface ReservationBody {
    readonly id?: string;
    readonly spaceSlug?: string;
    readonly isActive?: boolean;
}

const assertAPIErrorShape = (res: SuperTestResponse): void => {
    expect(Object.keys(res.body)).toEqual(['error']);
    const body = res.body as ErrorBody;
    expect(typeof body.error.code).toBe('string');
    expect(typeof body.error.message).toBe('string');
};

const ADMIN_TOKEN = 'admin-token-de-prueba-123456';
const SLUG = 'cancha-de-veteranos-miraflores';

// Hermetic in-memory adapter regardless of the ambient environment.
const container = buildContainer({ databaseUrl: '' });
const app = createApp(container);

const createIncident = async (description: string): Promise<IncidentBody> => {
    const res = await request(app)
        .post('/incidents')
        .send({ spaceSlug: SLUG, dni: '12345678', description: description });
    expect(res.status).toBe(201);
    return res.body as IncidentBody;
};

const patchState = (incidentId: string, state: string, token?: string): request.Test => {
    const req = request(app).patch(`/incidents/${incidentId}`);
    return token === undefined ? req.send({ state: state }) : req.set('Authorization', `Bearer ${token}`).send({ state: state });
};

describe('S1 — incident lifecycle over HTTP', (): void => {
    const originalToken: string | undefined = process.env['ADMIN_TOKEN'];

    beforeEach((): void => {
        process.env['ADMIN_TOKEN'] = ADMIN_TOKEN;
    });

    afterAll((): void => {
        if (originalToken === undefined) {
            delete process.env['ADMIN_TOKEN'];
            return;
        }
        process.env['ADMIN_TOKEN'] = originalToken;
    });

    it('a new incident starts UNDER_REVIEW and APPROVED advances it to 200 with the new state', async (): Promise<void> => {
        const incident = await createIncident('aro roto en la cancha norte');
        expect(incident.state).toBe('UNDER_REVIEW');

        const res = await patchState(incident.id ?? '', 'APPROVED', ADMIN_TOKEN);
        expect(res.status).toBe(200);
        const body = res.body as IncidentBody;
        expect(body.state).toBe('APPROVED');
        expect(body.spaceSlug).toBe(SLUG);
        expect(body).not.toHaveProperty('reporterId');
        expect(body.resolvedAt).toBeNull();
    });

    it('REJECTED is terminal: resolving a rejected incident answers 422 STATE_TRANSITION_INVALID', async (): Promise<void> => {
        const incident = await createIncident('banco roto');
        const rejected = await patchState(incident.id ?? '', 'REJECTED', ADMIN_TOKEN);
        expect(rejected.status).toBe(200);

        const res = await patchState(incident.id ?? '', 'RESOLVED', ADMIN_TOKEN);
        expect(res.status).toBe(422);
        assertAPIErrorShape(res);
        expect((res.body as ErrorBody).error.code).toBe('STATE_TRANSITION_INVALID');
    });

    it('RESOLVED sets resolvedAt and the incident is readable with the resolved state', async (): Promise<void> => {
        const incident = await createIncident('poste inclinado');
        await patchState(incident.id ?? '', 'APPROVED', ADMIN_TOKEN);
        const resolved = await patchState(incident.id ?? '', 'RESOLVED', ADMIN_TOKEN);
        expect(resolved.status).toBe(200);
        expect((resolved.body as IncidentBody).resolvedAt).not.toBeNull();

        const read = await request(app).get(`/incidents/${incident.id ?? ''}`);
        expect(read.status).toBe(200);
        expect((read.body as IncidentBody).state).toBe('RESOLVED');
    });

    it('a missing or wrong bearer token is 401 UNAUTHORIZED', async (): Promise<void> => {
        const incident = await createIncident('vidrio roto');

        const withoutToken = await patchState(incident.id ?? '', 'APPROVED');
        expect(withoutToken.status).toBe(401);
        assertAPIErrorShape(withoutToken);
        expect((withoutToken.body as ErrorBody).error.code).toBe('UNAUTHORIZED');

        const wrongToken = await patchState(incident.id ?? '', 'APPROVED', 'no-es-el-token');
        expect(wrongToken.status).toBe(401);
        expect((wrongToken.body as ErrorBody).error.code).toBe('UNAUTHORIZED');
    });

    it('an unconfigured ADMIN_TOKEN makes the route unroutable (404)', async (): Promise<void> => {
        const incident = await createIncident('techo roto');
        delete process.env['ADMIN_TOKEN'];

        const res = await patchState(incident.id ?? '', 'APPROVED', ADMIN_TOKEN);
        expect(res.status).toBe(404);
        assertAPIErrorShape(res);
    });

    it('an unknown incident id answers 404 INCIDENT_NOT_FOUND', async (): Promise<void> => {
        const res = await patchState(randomUUID(), 'APPROVED', ADMIN_TOKEN);
        expect(res.status).toBe(404);
        expect((res.body as ErrorBody).error.code).toBe('INCIDENT_NOT_FOUND');
    });

    it('a state outside {APPROVED, REJECTED, RESOLVED} is 400 BAD_REQUEST', async (): Promise<void> => {
        const incident = await createIncident('grada rota');
        for (const state of ['UNDER_REVIEW', 'BORRADO', '']) {
            const res = await patchState(incident.id ?? '', state, ADMIN_TOKEN);
            expect(res.status).toBe(400);
            assertAPIErrorShape(res);
        }
    });
});

describe('S4 — the citizen can cancel a reservation', (): void => {
    // The seeded horizon rolls with the business calendar, so the band is derived
    // from the space's own windows instead of a hardcoded date.
    const windowAt = async (dayOffset: number): Promise<{ start: string; end: string }> => {
        const res = await request(app).get(`/spaces/${SLUG}`);
        expect(res.status).toBe(200);
        const windows = (res.body as { availabilityWindows: { start: string; end: string }[] }).availabilityWindows;
        const window = windows[dayOffset];
        if (window === undefined) {
            throw new Error('seeded space has no window at offset ' + String(dayOffset));
        }
        return window;
    };

    const bandFrom = (window: { start: string; end: string }, offsetHours: number): { start: string; end: string } => ({
        start: new Date(new Date(window.start).getTime() + offsetHours * 3_600_000).toISOString(),
        end: new Date(new Date(window.start).getTime() + (offsetHours + 1) * 3_600_000).toISOString(),
    });

    it('DELETE cancels it (200, isActive false) and frees the slot for another DNI', async (): Promise<void> => {
        const created = await request(app)
            .post(`/spaces/${SLUG}/reservations`)
            .set('Idempotency-Key', randomUUID())
            .send({ dni: '11112222', role: 'NEIGHBOR', timeSlot: bandFrom(await windowAt(1), 1) });
        expect(created.status).toBe(201);
        const reservation = created.body as ReservationBody;
        expect(reservation.isActive).toBe(true);

        const cancelled = await request(app).delete(`/reservations/${reservation.id ?? ''}`);
        expect(cancelled.status).toBe(200);
        expect((cancelled.body as ReservationBody).isActive).toBe(false);
        expect((cancelled.body as ReservationBody).spaceSlug).toBe(SLUG);

        const again = await request(app)
            .post(`/spaces/${SLUG}/reservations`)
            .set('Idempotency-Key', randomUUID())
            .send({ dni: '33334444', role: 'NEIGHBOR', timeSlot: bandFrom(await windowAt(1), 1) });
        expect(again.status).toBe(201);
    });

    it('cancelling twice answers 409 RESERVATION_CONFLICT', async (): Promise<void> => {
        const created = await request(app)
            .post(`/spaces/${SLUG}/reservations`)
            .set('Idempotency-Key', randomUUID())
            .send({ dni: '55556666', role: 'NEIGHBOR', timeSlot: bandFrom(await windowAt(1), 3) });
        expect(created.status).toBe(201);
        const id = (created.body as ReservationBody).id ?? '';

        expect((await request(app).delete(`/reservations/${id}`)).status).toBe(200);
        const second = await request(app).delete(`/reservations/${id}`);
        expect(second.status).toBe(409);
        assertAPIErrorShape(second);
        expect((second.body as ErrorBody).error.code).toBe('RESERVATION_CONFLICT');
    });

    it('an unknown reservation id answers 404 RESERVATION_NOT_FOUND', async (): Promise<void> => {
        const res = await request(app).delete(`/reservations/${randomUUID()}`);
        expect(res.status).toBe(404);
        expect((res.body as ErrorBody).error.code).toBe('RESERVATION_NOT_FOUND');
    });
});

describe('S3 — the catalog horizon can be refreshed', (): void => {
    const originalSecret: string | undefined = process.env['CRON_SECRET'];

    beforeEach((): void => {
        process.env['CRON_SECRET'] = 'cron-secret-de-prueba';
    });

    afterAll((): void => {
        if (originalSecret === undefined) {
            delete process.env['CRON_SECRET'];
            return;
        }
        process.env['CRON_SECRET'] = originalSecret;
    });

    it('the in-memory adapter already rolls its horizon, so the refresh is a no-op (200, extended 0)', async (): Promise<void> => {
        const res = await request(app)
            .get('/internal/catalog/refresh')
            .set('Authorization', 'Bearer cron-secret-de-prueba');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ extended: 0 });
    });

    it('without the bearer token it is 401 and without CRON_SECRET it is 404', async (): Promise<void> => {
        const noToken = await request(app).get('/internal/catalog/refresh');
        expect(noToken.status).toBe(401);
        assertAPIErrorShape(noToken);

        delete process.env['CRON_SECRET'];
        const disabled = await request(app)
            .get('/internal/catalog/refresh')
            .set('Authorization', 'Bearer cron-secret-de-prueba');
        expect(disabled.status).toBe(404);
        assertAPIErrorShape(disabled);
    });
});
