/// <reference types="node" />
/// <reference types="jest" />

import { randomUUID } from "crypto";

import { buildContainer } from "../../src/infrastructure/di/container";
import { createApp } from "../../src/main";
import type { InMemorySpaceRepository } from "../../src/infrastructure/persistence/in-memory/space.in-memory.repository";
import type { Space } from "../../src/domain/entities/space.entity";
import request from "supertest";
import type { Response as SuperTestResponse } from "supertest";

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

// One app + one container for the whole suite (seeded ids stay stable, the
// inactive-space mutation applies to THIS app). Total request volume (~17)
// stays under the 100/15min rate limit for one IP.
const container = buildContainer();
const app = createApp(container);

const seedSpace = async (name: string): Promise<Space> => {
    const repo = container.resolve<InMemorySpaceRepository>('spaceRepository');
    const match = (await repo.findAll()).find((space: Space): boolean => space.name === name);
    if (match === undefined) {
        throw new Error(`seeded space not found: ${name}`);
    }
    return match;
};

// Slots are derived from the space's own availability window. Tests on the
// wide CANCHA_FUTBOL window (8:00–22:00, 14h) each take a distinct 1h band at
// `window start + offset`: offsets 1..13 all fit (13+1 ≤ 14).
const slotAt = (space: Space, offsetHours: number): { readonly start: string; readonly end: string } => {
    const window = space.availabilityWindows[0];
    if (window === undefined) {
        throw new Error('seeded space has no availability window');
    }
    const oneHourMs: number = 60 * 60 * 1000;
    return {
        start: new Date(window.start.getTime() + offsetHours * oneHourMs).toISOString(),
        end: new Date(window.start.getTime() + (offsetHours + 1) * oneHourMs).toISOString(),
    };
};

// A slot ending BEFORE the window opens (same calendar day → the TimeSlot VO
// accepts it; the Space rejects it because it falls outside availability).
const slotOutside = (space: Space): { readonly start: string; readonly end: string } => {
    const window = space.availabilityWindows[0];
    if (window === undefined) {
        throw new Error('seeded space has no availability window');
    }
    const oneHourMs: number = 60 * 60 * 1000;
    return {
        start: new Date(window.start.getTime() - 2 * oneHourMs).toISOString(),
        end: new Date(window.start.getTime() - oneHourMs).toISOString(),
    };
};

const postReservation = async (
    spaceId: string,
    slot: { readonly start: string; readonly end: string },
    role: string,
    key?: string,
): Promise<SuperTestResponse> => {
    const base = request(app)
        .post(`/spaces/${spaceId}/reservations`)
        .set('content-type', 'application/json');
    const req = key === undefined ? base : base.set('idempotency-key', key);
    return req.send({ userId: 'user-e2e', role: role, timeSlot: slot });
};

const postIncident = async (spaceId: string): Promise<SuperTestResponse> => {
    return request(app)
        .post('/incidents')
        .set('content-type', 'application/json')
        .send({ spaceId: spaceId, reporterId: 'user-e2e', description: 'Broken hoop' });
};

describe('E2E — POST /spaces/:id/reservations', (): void => {
    it('happy path → 201 with the full reservation DTO (NEIGHBOR ×1.0)', async (): Promise<void> => {
        const space = await seedSpace('Cancha de Veteranos Miraflores'); // base 100 PEN, window 8:00–22:00
        const res = await postReservation(space.id.value, slotAt(space, 1), 'NEIGHBOR', randomUUID());
        expect(res.status).toBe(201);
        const body = res.body as ReservationBody;
        expect(body.error).toBeUndefined();
        expect(body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect(body.spaceId).toBe(space.id.value);
        expect(body.userId).toBe('user-e2e');
        expect(body.role).toBe('NEIGHBOR');
        expect(body.cost).toEqual({ amount: space.basePrice.amount, currency: 'PEN' });
        expect(body.isActive).toBe(true);
        expect(typeof body.createdAt).toBe('string');
        if (body.timeSlot === undefined) {
            throw new Error('unexpected body shape: timeSlot missing');
        }
        expect(body.timeSlot.start).toBe(slotAt(space, 1).start);
        expect(body.timeSlot.end).toBe(slotAt(space, 1).end);
    });

    it('SENIOR pays ×0.5 → 201', async (): Promise<void> => {
        const space = await seedSpace('Cancha de Veteranos Miraflores');
        const res = await postReservation(space.id.value, slotAt(space, 3), 'SENIOR', randomUUID());
        expect(res.status).toBe(201);
        const seniorCost = (res.body as ReservationBody).cost;
        if (seniorCost === undefined) {
            throw new Error('unexpected body shape: cost missing');
        }
        expect(seniorCost.amount).toBe(space.basePrice.amount * 0.5);
    });

    it('PRIVATE_CLUB pays ×1.2 with half-up rounding → 201 (50.50 → 60.60)', async (): Promise<void> => {
        const space = await seedSpace('Pista Comunal Barranco'); // base 50.5 PEN
        const res = await postReservation(space.id.value, slotAt(space, 1), 'PRIVATE_CLUB', randomUUID());
        expect(res.status).toBe(201);
        const body = res.body as ReservationBody;
        if (body.cost === undefined) {
            throw new Error('unexpected body shape: cost missing');
        }
        expect(body.cost.amount).toBe(60.6);
        expect(body.cost.currency).toBe('PEN');
    });

    it('missing Idempotency-Key → 400 MISSING_IDEMPOTENCY_KEY (APIError shape)', async (): Promise<void> => {
        const space = await seedSpace('Cancha de Veteranos Miraflores');
        const res = await postReservation(space.id.value, slotAt(space, 5), 'NEIGHBOR');
        expect(res.status).toBe(400);
        expect((res.body as ErrorBody).error.code).toBe('MISSING_IDEMPOTENCY_KEY');
        assertAPIErrorShape(res);
    });

    it('malformed space id (not a UUID v4) → 400 BAD_REQUEST (APIError shape)', async (): Promise<void> => {
        const res = await postReservation('not-a-uuid', slotAt(await seedSpace('Cancha de Veteranos Miraflores'), 7), 'NEIGHBOR', randomUUID());
        expect(res.status).toBe(400);
        expect((res.body as ErrorBody).error.code).toBe('BAD_REQUEST');
        assertAPIErrorShape(res);
    });

    it('unknown space id → 404 SPACE_NOT_FOUND (APIError shape)', async (): Promise<void> => {
        const res = await postReservation(randomUUID(), slotAt(await seedSpace('Cancha de Veteranos Miraflores'), 9), 'NEIGHBOR', randomUUID());
        expect(res.status).toBe(404);
        expect((res.body as ErrorBody).error.code).toBe('SPACE_NOT_FOUND');
        assertAPIErrorShape(res);
    });

    it('slot outside availability → 400 BAD_REQUEST (APIError shape)', async (): Promise<void> => {
        const space = await seedSpace('Cancha de Veteranos Miraflores');
        const res = await postReservation(space.id.value, slotOutside(space), 'NEIGHBOR', randomUUID());
        expect(res.status).toBe(400);
        expect((res.body as ErrorBody).error.code).toBe('BAD_REQUEST');
        assertAPIErrorShape(res);
    });

    it('duplicate active reservation on the same slot → 409 RESERVATION_CONFLICT (APIError shape)', async (): Promise<void> => {
        const space = await seedSpace('Cancha de Veteranos Miraflores');
        const slot = slotAt(space, 11);
        const first = await postReservation(space.id.value, slot, 'NEIGHBOR', randomUUID());
        expect(first.status).toBe(201);
        const second = await postReservation(space.id.value, slot, 'NEIGHBOR', randomUUID());
        expect(second.status).toBe(409);
        expect((second.body as ErrorBody).error.code).toBe('RESERVATION_CONFLICT');
        assertAPIErrorShape(second);
    });

    it('invalid role → 400 BAD_REQUEST (APIError shape)', async (): Promise<void> => {
        const space = await seedSpace('Cancha de Veteranos Miraflores');
        const res = await postReservation(space.id.value, slotAt(space, 13), 'ADMIN', randomUUID());
        expect(res.status).toBe(400);
        expect((res.body as ErrorBody).error.code).toBe('BAD_REQUEST');
        assertAPIErrorShape(res);
    });
});

describe('E2E — idempotency end-to-end (D4)', (): void => {
    it('same key + same body replays the SAME reservation; different body → 422 payload_mismatch', async (): Promise<void> => {
        const space = await seedSpace('Losas Comunitarias Barranco'); // keeps CANCHA window free of extra bands
        const slot = slotAt(space, 1);
        const key: string = randomUUID();

        const first = await postReservation(space.id.value, slot, 'NEIGHBOR', key);
        expect(first.status).toBe(201);
        const firstBody = first.body as ReservationBody;

        const replay = await postReservation(space.id.value, slot, 'NEIGHBOR', key);
        expect(replay.status).toBe(201);
        expect((replay.body as ReservationBody).id).toBe(firstBody.id); // SAME reservation, replayed

        const mismatch = await postReservation(space.id.value, slot, 'SENIOR', key);
        expect(mismatch.status).toBe(422);
        const errBody = mismatch.body as ErrorBody;
        expect(errBody.error.code).toBe('IDEMPOTENCY_CONFLICT');
        expect(errBody.error.message).not.toBe('');
        expect(errBody.error.details).toMatchObject({ reason: 'payload_mismatch' });
        assertAPIErrorShape(mismatch);
    });
});

describe('E2E — POST /incidents', (): void => {
    it('happy path → 201 with UNDER_REVIEW and resolvedAt null', async (): Promise<void> => {
        const space = await seedSpace('Losas Comunitarias Barranco');
        const res = await postIncident(space.id.value);
        expect(res.status).toBe(201);
        const body = res.body as IncidentBody;
        expect(body.error).toBeUndefined();
        expect(body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect(body.spaceId).toBe(space.id.value);
        expect(body.reporterId).toBe('user-e2e');
        expect(body.description).toBe('Broken hoop');
        expect(body.state).toBe('UNDER_REVIEW');
        expect(body.resolvedAt).toBeNull();
        expect(typeof body.createdAt).toBe('string');
    });

    it('unknown space id → 404 SPACE_NOT_FOUND (APIError shape)', async (): Promise<void> => {
        const res = await postIncident(randomUUID());
        expect(res.status).toBe(404);
        expect((res.body as ErrorBody).error.code).toBe('SPACE_NOT_FOUND');
        assertAPIErrorShape(res);
    });

    it('inactive space → 400 BAD_REQUEST with the handler message (APIError shape)', async (): Promise<void> => {
        const space = await seedSpace('Multiusos San Isidro');
        space.deactivate();
        await container.resolve<InMemorySpaceRepository>('spaceRepository').save(space);
        const res = await postIncident(space.id.value);
        expect(res.status).toBe(400);
        const errBody = res.body as ErrorBody;
        expect(errBody.error.code).toBe('BAD_REQUEST');
        expect(errBody.error.message).toBe('cannot file incident on inactive space');
        assertAPIErrorShape(res);
    });
});
