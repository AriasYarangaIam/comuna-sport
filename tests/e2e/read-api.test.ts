/// <reference types="node" />
/// <reference types="jest" />

import { randomUUID } from "crypto";

import { buildContainer } from "../../src/infrastructure/di/container";
import { createApp } from "../../src/main";
import type { InMemorySpaceRepository } from "../../src/infrastructure/persistence/in-memory/space.in-memory.repository";
import type { Space } from "../../src/domain/entities/space.entity";
import request from "supertest";
import type { Response as SuperTestResponse } from "supertest";

interface SpaceWindowBody {
    readonly start: string;
    readonly end: string;
}

interface SpaceBody {
    readonly id: string;
    readonly name: string;
    readonly type: string;
    readonly capacity: number;
    readonly basePrice: { readonly amount: number; readonly currency: string };
    readonly isActive: boolean;
    readonly availabilityWindows: readonly SpaceWindowBody[];
}

interface ReservationBody {
    readonly id?: string;
    readonly spaceId?: string;
    readonly userId?: string;
    readonly role?: string;
    readonly timeSlot?: { readonly start: string; readonly end: string };
    readonly cost?: { readonly amount: number; readonly currency: string };
    readonly createdAt?: string;
    readonly isActive?: boolean;
    readonly error?: {
        readonly code: string;
        readonly message: string;
        readonly details?: unknown;
    };
}

interface IncidentBody {
    readonly id?: string;
    readonly spaceId?: string;
    readonly reporterId?: string;
    readonly description?: string;
    readonly state?: string;
    readonly createdAt?: string;
    readonly resolvedAt?: string | null;
    readonly error?: {
        readonly code: string;
        readonly message: string;
        readonly details?: unknown;
    };
}

interface ErrorBody {
    readonly error: {
        readonly code: string;
        readonly message: string;
        readonly details?: unknown;
    };
}

const assertAPIErrorShape = (res: SuperTestResponse): void => {
    const body = res.body as ErrorBody;
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(typeof body.error.code).toBe('string');
    expect(typeof body.error.message).toBe('string');
};

// One app + one container for the whole suite. The empty databaseUrl pins the
// in-memory adapter (the same 4 seeded spaces), so the suite always runs
// hermetically — with or without DATABASE_URL exported in the environment.
// Total request volume (~15) stays under the 100/15min rate limit for one IP.
const container = buildContainer({ databaseUrl: '' });
const app = createApp(container);

const SEEDED_SPACE_NAMES: readonly string[] = [
    'Cancha de Veteranos Miraflores',
    'Losas Comunitarias Barranco',
    'Pista Comunal Barranco',
    'Multiusos San Isidro',
];

const seedSpace = async (name: string): Promise<Space> => {
    const repo = container.resolve<InMemorySpaceRepository>('spaceRepository');
    const match = (await repo.findAll()).find((space: Space): boolean => space.name === name);
    if (match === undefined) {
        throw new Error(`seeded space not found: ${name}`);
    }
    return match;
};

// Every space answers with the same JSON contract: the identity, the catalog
// fields, the price, the active flag and the availability windows.
const assertSpaceShape = (body: SpaceBody): void => {
    expect(Object.keys(body).sort()).toEqual([
        'availabilityWindows',
        'basePrice',
        'capacity',
        'id',
        'isActive',
        'name',
        'type',
    ]);
    expect(Object.keys(body.basePrice).sort()).toEqual(['amount', 'currency']);
    expect(typeof body.id).toBe('string');
    expect(body.name).not.toBe('');
    expect(typeof body.type).toBe('string');
    expect(typeof body.capacity).toBe('number');
    expect(typeof body.basePrice.amount).toBe('number');
    expect(body.basePrice.currency).toBe('PEN');
    expect(body.isActive).toBe(true);
    expect(body.availabilityWindows.length).toBeGreaterThan(0);
    for (const window of body.availabilityWindows) {
        expect(Object.keys(window).sort()).toEqual(['end', 'start']);
        expect(Number.isNaN(Date.parse(window.start))).toBe(false);
        expect(Number.isNaN(Date.parse(window.end))).toBe(false);
    }
};

// America/Lima has no DST (UTC-05:00 all year round), so the business-day wall
// clock converts to UTC with a fixed offset.
const LIMA_OFFSET_MS: number = -5 * 60 * 60 * 1000;

interface LimaDay {
    readonly year: number;
    readonly month: number;
    readonly day: number;
}

const limaDay = (date: Date): LimaDay => {
    const parts: string[] = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date).split('-');
    const year: number = Number(parts[0]);
    const month: number = Number(parts[1]);
    const day: number = Number(parts[2]);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
        throw new Error('could not resolve the America/Lima calendar day');
    }
    return { year: year, month: month, day: day };
};

// A band on the current America/Lima business day, expressed as Z-suffixed ISO
// (the exact shape `z.iso.datetime()` accepts at the boundary). The in-memory
// seeds pin their windows to the machine's local calendar day, which is
// America/Lima in this environment — so 05:00–06:00 opens before every window.
const limaBand = (startHour: number, endHour: number): { readonly start: string; readonly end: string } => {
    const day: LimaDay = limaDay(new Date());
    const start: Date = new Date(Date.UTC(day.year, day.month - 1, day.day, startHour, 0, 0) - LIMA_OFFSET_MS);
    const end: Date = new Date(Date.UTC(day.year, day.month - 1, day.day, endHour, 0, 0) - LIMA_OFFSET_MS);
    return { start: start.toISOString(), end: end.toISOString() };
};

// A 1-hour band one hour after the space's own window opens — derived from the
// window itself, so the test never assumes a wall-clock hour.
const bandInsideWindow = (space: Space): { readonly start: string; readonly end: string } => {
    const window = space.availabilityWindows[0];
    if (window === undefined) {
        throw new Error('seeded space has no availability window');
    }
    const oneHourMs: number = 60 * 60 * 1000;
    return {
        start: new Date(window.start.getTime() + oneHourMs).toISOString(),
        end: new Date(window.start.getTime() + 2 * oneHourMs).toISOString(),
    };
};

const postReservation = async (
    spaceId: string,
    slot: { readonly start: string; readonly end: string },
    role: string,
    userId: string,
    key: string,
): Promise<SuperTestResponse> => {
    return request(app)
        .post(`/spaces/${spaceId}/reservations`)
        .set('content-type', 'application/json')
        .set('idempotency-key', key)
        .send({ userId: userId, role: role, timeSlot: slot });
};

const postIncident = async (spaceId: string, description: string): Promise<SuperTestResponse> => {
    return request(app)
        .post('/incidents')
        .set('content-type', 'application/json')
        .send({ spaceId: spaceId, reporterId: 'user-read-api', description: description });
};

describe('E2E — GET /spaces', (): void => {
    it('lists the 4 seeded spaces with the full space contract', async (): Promise<void> => {
        const res = await request(app).get('/spaces');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        const spaces = res.body as SpaceBody[];
        expect(spaces).toHaveLength(4);
        expect(spaces.map((space: SpaceBody): string => space.name).sort()).toEqual(
            [...SEEDED_SPACE_NAMES].sort()
        );
        for (const space of spaces) {
            assertSpaceShape(space);
        }
    });
});

describe('E2E — GET /spaces/:id', (): void => {
    it('seeded id → 200 with the same space', async (): Promise<void> => {
        const space = await seedSpace('Cancha de Veteranos Miraflores');
        const res = await request(app).get(`/spaces/${space.id.value}`);
        expect(res.status).toBe(200);
        const body = res.body as SpaceBody;
        assertSpaceShape(body);
        expect(body.id).toBe(space.id.value);
        expect(body.name).toBe('Cancha de Veteranos Miraflores');
        expect(body.type).toBe('CANCHA_FUTBOL');
        expect(body.capacity).toBe(space.capacity);
        expect(body.basePrice.amount).toBe(space.basePrice.amount);
    });

    it('unknown but valid UUID v4 → 404 SPACE_NOT_FOUND (APIError shape)', async (): Promise<void> => {
        const res = await request(app).get(`/spaces/${randomUUID()}`);
        expect(res.status).toBe(404);
        expect((res.body as ErrorBody).error.code).toBe('SPACE_NOT_FOUND');
        assertAPIErrorShape(res);
    });

    it('malformed id → 400 BAD_REQUEST (APIError shape)', async (): Promise<void> => {
        const res = await request(app).get('/spaces/not-a-uuid');
        expect(res.status).toBe(400);
        expect((res.body as ErrorBody).error.code).toBe('BAD_REQUEST');
        assertAPIErrorShape(res);
    });
});

describe('E2E — GET /spaces/availability', (): void => {
    it('band inside a seeded window → 200 with that space in the array', async (): Promise<void> => {
        const space = await seedSpace('Cancha de Veteranos Miraflores');
        const band = bandInsideWindow(space);
        const res = await request(app).get('/spaces/availability').query({ start: band.start, end: band.end });
        expect(res.status).toBe(200);
        const spaces = res.body as SpaceBody[];
        expect(Array.isArray(spaces)).toBe(true);
        expect(spaces.map((entry: SpaceBody): string => entry.id)).toContain(space.id.value);
        for (const entry of spaces) {
            assertSpaceShape(entry);
        }
    });

    it('band outside every seeded window (05:00–06:00 Lima) → 200 with an empty array', async (): Promise<void> => {
        const band = limaBand(5, 6);
        const res = await request(app).get('/spaces/availability').query({ start: band.start, end: band.end });
        expect(res.status).toBe(200);
        const spaces = res.body as SpaceBody[];
        expect(Array.isArray(spaces)).toBe(true);
        expect(spaces).toEqual([]);
    });

    it('malformed start → 400 BAD_REQUEST (APIError shape)', async (): Promise<void> => {
        const band = limaBand(9, 10);
        const res = await request(app).get('/spaces/availability').query({ start: 'not-a-date', end: band.end });
        expect(res.status).toBe(400);
        expect((res.body as ErrorBody).error.code).toBe('BAD_REQUEST');
        assertAPIErrorShape(res);
    });
});

describe('E2E — GET /reservations/:id and GET /users/:userId/reservations', (): void => {
    it('created reservation is readable by id and listed for its user', async (): Promise<void> => {
        const space = await seedSpace('Pista Comunal Barranco');
        const band = bandInsideWindow(space);
        const userId = 'user-read-api';
        const created = await postReservation(space.id.value, band, 'NEIGHBOR', userId, randomUUID());
        expect(created.status).toBe(201);
        const createdBody = created.body as ReservationBody;
        expect(createdBody.error).toBeUndefined();
        expect(typeof createdBody.id).toBe('string');

        const byId = await request(app).get(`/reservations/${createdBody.id}`);
        expect(byId.status).toBe(200);
        const byIdBody = byId.body as ReservationBody;
        expect(byIdBody.id).toBe(createdBody.id);
        expect(byIdBody.spaceId).toBe(createdBody.spaceId);
        expect(byIdBody.userId).toBe(userId);
        expect(byIdBody.role).toBe('NEIGHBOR');
        if (byIdBody.cost === undefined || createdBody.cost === undefined) {
            throw new Error('unexpected body shape: cost missing');
        }
        expect(byIdBody.cost.amount).toBe(createdBody.cost.amount);
        expect(byIdBody.cost.currency).toBe('PEN');

        const byUser = await request(app).get(`/users/${userId}/reservations`);
        expect(byUser.status).toBe(200);
        const byUserBody = byUser.body as ReservationBody[];
        expect(Array.isArray(byUserBody)).toBe(true);
        expect(byUserBody.map((entry: ReservationBody): string | undefined => entry.id)).toContain(createdBody.id);
    });

    it('unknown reservation id → 404 RESERVATION_NOT_FOUND (APIError shape)', async (): Promise<void> => {
        const res = await request(app).get(`/reservations/${randomUUID()}`);
        expect(res.status).toBe(404);
        expect((res.body as ErrorBody).error.code).toBe('RESERVATION_NOT_FOUND');
        assertAPIErrorShape(res);
    });
});

describe('E2E — GET /incidents/:id and GET /spaces/:id/incidents', (): void => {
    it('created incident is readable by id and listed for its space', async (): Promise<void> => {
        const space = await seedSpace('Losas Comunitarias Barranco');
        const created = await postIncident(space.id.value, 'Broken hoop');
        expect(created.status).toBe(201);
        const createdBody = created.body as IncidentBody;
        expect(createdBody.error).toBeUndefined();
        expect(typeof createdBody.id).toBe('string');

        const byId = await request(app).get(`/incidents/${createdBody.id}`);
        expect(byId.status).toBe(200);
        const byIdBody = byId.body as IncidentBody;
        expect(byIdBody.id).toBe(createdBody.id);
        expect(byIdBody.spaceId).toBe(space.id.value);
        expect(byIdBody.state).toBe('UNDER_REVIEW');

        const bySpace = await request(app).get(`/spaces/${space.id.value}/incidents`);
        expect(bySpace.status).toBe(200);
        const bySpaceBody = bySpace.body as IncidentBody[];
        expect(Array.isArray(bySpaceBody)).toBe(true);
        expect(bySpaceBody.map((entry: IncidentBody): string | undefined => entry.id)).toContain(createdBody.id);
    });

    it('unknown incident id → 404 INCIDENT_NOT_FOUND (APIError shape)', async (): Promise<void> => {
        const res = await request(app).get(`/incidents/${randomUUID()}`);
        expect(res.status).toBe(404);
        expect((res.body as ErrorBody).error.code).toBe('INCIDENT_NOT_FOUND');
        assertAPIErrorShape(res);
    });
});
