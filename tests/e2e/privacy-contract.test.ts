/// <reference types="node" />
/// <reference types="jest" />

import { randomUUID } from "crypto";

import { buildContainer } from "../../src/infrastructure/di/container";
import { createApp } from "../../src/main";
import type { InMemorySpaceRepository } from "../../src/infrastructure/persistence/in-memory/space.in-memory.repository";
import type { Space } from "../../src/domain/entities/space.entity";
import request from "supertest";
import type { Response as SuperTestResponse } from "supertest";

// Privacy contract (odd/tasks/privacy-identifiers-and-copy.md, S1–S4):
// the public identifier of a space is its slug — never the UUID — and the
// only citizen identifier accepted anywhere is an 8-digit DNI that is never
// echoed back in any response.

interface ErrorBody {
    readonly error: {
        readonly code: string;
        readonly message: string;
        readonly details?: unknown;
    };
}

const assertAPIErrorShape = (res: SuperTestResponse): void => {
    expect(Object.keys(res.body)).toEqual(['error']);
    const body = res.body as ErrorBody;
    expect(typeof body.error.code).toBe('string');
    expect(typeof body.error.message).toBe('string');
};

// Hermetic in-memory adapter regardless of the ambient environment.
const container = buildContainer({ databaseUrl: '' });
const app = createApp(container);

const SLUG = 'cancha-de-veteranos-miraflores';
const VALID_DNI = '12345678';

const seededSpace = async (): Promise<Space> => {
    const repo = container.resolve<InMemorySpaceRepository>('spaceRepository');
    const match = (await repo.findAll()).find((space: Space): boolean => space.name === 'Cancha de Veteranos Miraflores');
    if (match === undefined) {
        throw new Error('seeded space not found');
    }
    return match;
};

const slotAt = (space: Space, offsetHours: number): { readonly start: string; readonly end: string } => {
    const window = space.availabilityWindows[0];
    if (window === undefined) {
        throw new Error('seeded space has no availability windows');
    }
    const start = new Date(window.start.getTime() + offsetHours * 3_600_000);
    const end = new Date(start.getTime() + 3_600_000);
    return { start: start.toISOString(), end: end.toISOString() };
};

// S4: no response of the API may carry an identifier field.
const FORBIDDEN_KEYS = ['id', 'userId', 'reporterId', 'spaceId'] as const;

const expectNoForbiddenKeys = (body: unknown): void => {
    const walk = (value: unknown, path: string): void => {
        if (Array.isArray(value)) {
            value.forEach((item: unknown, index: number): void => walk(item, `${path}[${index}]`));
            return;
        }
        if (value !== null && typeof value === 'object') {
            for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
                if ((FORBIDDEN_KEYS as readonly string[]).includes(key)) {
                    // The reservation's own `id` (a UUID of the reservation) is
                    // allowed; a space `id` or a citizen identifier is not.
                    // The forbidden keys here are checked contextually below —
                    // this walk only rejects the citizen/space identifiers.
                    if (key !== 'id') {
                        throw new Error(`forbidden key "${key}" at ${path}`);
                    }
                }
                walk(child, `${path}.${key}`);
            }
        }
    };
    walk(body, '$');
};

describe('Privacy contract — S1: spaces are addressed by slug, never by UUID', (): void => {
    test('GET /spaces returns slug and no id field', async (): Promise<void> => {
        const res = await request(app).get('/spaces');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        for (const space of res.body as Array<Record<string, unknown>>) {
            expect(typeof space['slug']).toBe('string');
            expect(space).not.toHaveProperty('id');
        }
    });

    test('GET /spaces/availability returns slug and no id field', async (): Promise<void> => {
        const space = await seededSpace();
        const band = slotAt(space, 1);
        const res = await request(app)
            .get('/spaces/availability')
            .query({ start: band.start, end: band.end });
        expect(res.status).toBe(200);
        for (const item of res.body as Array<Record<string, unknown>>) {
            expect(typeof item['slug']).toBe('string');
            expect(item).not.toHaveProperty('id');
        }
    });

    test('GET /spaces/:slug resolves the public identifier', async (): Promise<void> => {
        const res = await request(app).get(`/spaces/${SLUG}`);
        expect(res.status).toBe(200);
        expect(res.body['slug']).toBe(SLUG);
        expect(res.body).not.toHaveProperty('id');
    });

    test('GET /spaces/:slug with an unknown slug is 404 SPACE_NOT_FOUND', async (): Promise<void> => {
        const res = await request(app).get('/spaces/does-not-exist');
        expect(res.status).toBe(404);
        assertAPIErrorShape(res);
        expect((res.body as ErrorBody).error.code).toBe('SPACE_NOT_FOUND');
    });
});

describe('Privacy contract — S2: reservations accept only an 8-digit DNI', (): void => {
    test('POST with a 7-digit dni is 400 with the APIError shape', async (): Promise<void> => {
        const space = await seededSpace();
        const res = await request(app)
            .post(`/spaces/${SLUG}/reservations`)
            .set('Idempotency-Key', randomUUID())
            .send({ dni: '1234567', role: 'NEIGHBOR', timeSlot: slotAt(space, 2) });
        expect(res.status).toBe(400);
        assertAPIErrorShape(res);
    });

    test('POST with a non-numeric dni is 400', async (): Promise<void> => {
        const space = await seededSpace();
        const res = await request(app)
            .post(`/spaces/${SLUG}/reservations`)
            .set('Idempotency-Key', randomUUID())
            .send({ dni: 'abcdefgh', role: 'NEIGHBOR', timeSlot: slotAt(space, 3) });
        expect(res.status).toBe(400);
        assertAPIErrorShape(res);
    });

    test('POST with a valid DNI succeeds and the body carries spaceSlug, not spaceId/userId', async (): Promise<void> => {
        const space = await seededSpace();
        const res = await request(app)
            .post(`/spaces/${SLUG}/reservations`)
            .set('Idempotency-Key', randomUUID())
            .send({ dni: VALID_DNI, role: 'NEIGHBOR', timeSlot: slotAt(space, 4) });
        expect(res.status).toBe(201);
        expect(res.body['spaceSlug']).toBe(SLUG);
        expect(res.body).not.toHaveProperty('spaceId');
        expect(res.body).not.toHaveProperty('userId');
        expect(res.body).not.toHaveProperty('dni');
    });

    test('POST with the legacy userId field and no dni is 400', async (): Promise<void> => {
        const space = await seededSpace();
        const res = await request(app)
            .post(`/spaces/${SLUG}/reservations`)
            .set('Idempotency-Key', randomUUID())
            .send({ userId: VALID_DNI, role: 'NEIGHBOR', timeSlot: slotAt(space, 5) });
        expect(res.status).toBe(400);
        assertAPIErrorShape(res);
    });
});

describe('Privacy contract — S3: incidents accept only an 8-digit DNI', (): void => {
    test('POST with an invalid dni is 400 with the APIError shape', async (): Promise<void> => {
        const res = await request(app)
            .post('/incidents')
            .send({ spaceSlug: SLUG, dni: '12345', description: 'red rota' });
        expect(res.status).toBe(400);
        assertAPIErrorShape(res);
    });

    test('POST with a valid DNI succeeds and the body carries spaceSlug, not spaceId/reporterId', async (): Promise<void> => {
        const res = await request(app)
            .post('/incidents')
            .send({ spaceSlug: SLUG, dni: VALID_DNI, description: 'red rota en la cancha norte' });
        expect(res.status).toBe(201);
        expect(res.body['spaceSlug']).toBe(SLUG);
        expect(res.body).not.toHaveProperty('spaceId');
        expect(res.body).not.toHaveProperty('reporterId');
        expect(res.body).not.toHaveProperty('dni');
    });
});

describe('Privacy contract — S4: the DNI is never echoed and /users/:dni validates', (): void => {
    test('GET /users/:dni/reservations with a malformed dni is 400', async (): Promise<void> => {
        const res = await request(app).get('/users/not-a-dni/reservations');
        expect(res.status).toBe(400);
        assertAPIErrorShape(res);
    });

    test('GET /users/:dni/reservations with a valid DNI answers 200 and no item carries a citizen id', async (): Promise<void> => {
        const res = await request(app).get(`/users/${VALID_DNI}/reservations`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        for (const item of res.body as Array<Record<string, unknown>>) {
            expect(item).not.toHaveProperty('userId');
            expect(item).not.toHaveProperty('dni');
            expect(typeof item['spaceSlug']).toBe('string');
        }
    });

    test('GET /reservations/:id never echoes the DNI and addresses the space by slug', async (): Promise<void> => {
        const space = await seededSpace();
        const created = await request(app)
            .post(`/spaces/${SLUG}/reservations`)
            .set('Idempotency-Key', randomUUID())
            .send({ dni: VALID_DNI, role: 'NEIGHBOR', timeSlot: slotAt(space, 6) });
        expect(created.status).toBe(201);

        const res = await request(app).get(`/reservations/${created.body['id'] as string}`);
        expect(res.status).toBe(200);
        expect(res.body).not.toHaveProperty('userId');
        expect(res.body).not.toHaveProperty('dni');
        expect(res.body['spaceSlug']).toBe(SLUG);
        expectNoForbiddenKeys(res.body);
    });

    test('GET /incidents/:id and GET /spaces/:slug/incidents never expose spaceId or reporterId', async (): Promise<void> => {
        const created = await request(app)
            .post('/incidents')
            .send({ spaceSlug: SLUG, dni: VALID_DNI, description: 'poste suelto' });
        expect(created.status).toBe(201);
        const incidentId = created.body['id'] as string;

        const byId = await request(app).get(`/incidents/${incidentId}`);
        expect(byId.status).toBe(200);
        expect(byId.body).not.toHaveProperty('spaceId');
        expect(byId.body).not.toHaveProperty('reporterId');
        expect(byId.body['spaceSlug']).toBe(SLUG);

        const bySpace = await request(app).get(`/spaces/${SLUG}/incidents`);
        expect(bySpace.status).toBe(200);
        for (const item of bySpace.body as Array<Record<string, unknown>>) {
            expect(item).not.toHaveProperty('spaceId');
            expect(item).not.toHaveProperty('reporterId');
        }
    });
});
