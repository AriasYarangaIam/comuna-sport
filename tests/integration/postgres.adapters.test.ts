/// <reference types="node" />
/// <reference types="jest" />

import { createHash, randomInt, randomUUID } from "crypto";
import type { Pool } from "pg";

import { closePool, createPool } from "../../src/infrastructure/persistence/postgres/pool";
import { PostgresIdempotencyStore } from "../../src/infrastructure/persistence/postgres/idempotency.postgres.store";
import { PostgresIncidentRepository } from "../../src/infrastructure/persistence/postgres/incident.postgres.repository";
import { PostgresReservationRepository } from "../../src/infrastructure/persistence/postgres/reservation.postgres.repository";
import { PostgresSpaceRepository } from "../../src/infrastructure/persistence/postgres/space.postgres.repository";
import { Cost } from "../../src/domain/value-objects/cost.vo";
import { Incident } from "../../src/domain/entities/incident.entity";
import { Reservation } from "../../src/domain/entities/reservation.entity";
import type { Space } from "../../src/domain/entities/space.entity";
import { ReservationConflictException } from "../../src/domain/exceptions/reservation-conflict.exception";
import { SpaceId } from "../../src/domain/value-objects/space-id.vo";
import { TimeSlot } from "../../src/domain/value-objects/time-slot.vo";
import { UserRole } from "../../src/domain/value-objects/user-role.vo";

// The URL comes from the environment ONLY — the suite never loads `.env`, so
// the default `pnpm test` run stays hermetic (no database required).
const databaseUrl: string | undefined = process.env['DATABASE_URL'];
const connectionString: string = databaseUrl === undefined ? '' : databaseUrl.trim();
const databaseEnabled: boolean = connectionString !== '';

// Enables (or skips) the whole suite in one place, with the reason logged so a
// skipped run is never mistaken for a green one.
const describeWithDatabase = (name: string, suite: () => void): void => {
    if (!databaseEnabled) {
        console.log(
            '[postgres.adapters] SKIPPED — DATABASE_URL is not set. ' +
            "Enable it with: $env:DATABASE_URL='postgres://comuna:comuna@localhost:5434/comuna_sport'; pnpm test"
        );
        describe.skip(name, suite);
        return;
    }
    describe(name, suite);
};

// Seeded catalog ids (db/migrations/002_seed_spaces.sql).
const SEEDED_CANCHA_ID: string = '11111111-1111-4111-8111-111111111111';
const SEEDED_LOSA_ID: string = '22222222-2222-4222-8222-222222222222';
const SEEDED_PISTA_ID: string = '33333333-3333-4333-8333-333333333333';
const SEEDED_MULTIUSOS_ID: string = '44444444-4444-4444-8444-444444444444';

const SEEDED_SPACE_NAMES: readonly string[] = [
    'Cancha de Veteranos Miraflores',
    'Losas Comunitarias Barranco',
    'Pista Comunal Barranco',
    'Multiusos San Isidro',
];

const ONE_HOUR_MS: number = 60 * 60 * 1000;

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

// 05:00–06:00 on the current America/Lima business day: earlier than every
// seeded window opens, so no space can match it.
const limaBandOutsideEveryWindow = (): TimeSlot => {
    const day: LimaDay = limaDay(new Date());
    const start: Date = new Date(Date.UTC(day.year, day.month - 1, day.day, 5, 0, 0) - LIMA_OFFSET_MS);
    const end: Date = new Date(Date.UTC(day.year, day.month - 1, day.day, 6, 0, 0) - LIMA_OFFSET_MS);
    return TimeSlot.create(start, end);
};

const sha256 = (payload: string): string => createHash('sha256').update(payload).digest('hex');

describeWithDatabase('Postgres adapters (D3)', (): void => {
    let pool: Pool;
    let spaceRepository: PostgresSpaceRepository;
    let reservationRepository: PostgresReservationRepository;
    let incidentRepository: PostgresIncidentRepository;
    let idempotencyStore: PostgresIdempotencyStore;

    beforeAll(async (): Promise<void> => {
        pool = createPool(connectionString);
        spaceRepository = new PostgresSpaceRepository(pool);
        reservationRepository = new PostgresReservationRepository(pool);
        incidentRepository = new PostgresIncidentRepository(pool);
        idempotencyStore = new PostgresIdempotencyStore(pool);
    });

    afterAll(async (): Promise<void> => {
        await closePool(pool);
    });

    // Every case cleans up after itself — the seeded catalog (spaces and their
    // availability windows) is never touched.
    afterEach(async (): Promise<void> => {
        await pool.query('DELETE FROM reservations');
        await pool.query('DELETE FROM incidents');
        await pool.query('DELETE FROM idempotency_keys');
    });

    // The seeded catalog carries one window per space per day for the next 30
    // days, so a random window gives every run its own slot and parallel runs
    // cannot collide.
    const randomWindowOf = async (spaceId: string): Promise<TimeSlot> => {
        const space: Space | null = await spaceRepository.findById(SpaceId.create(spaceId));
        if (space === null) {
            throw new Error(`seeded space not found: ${spaceId}`);
        }
        const window: TimeSlot | undefined = space.availabilityWindows[randomInt(0, space.availabilityWindows.length)];
        if (window === undefined) {
            throw new Error(`seeded space has no availability window: ${spaceId}`);
        }
        return window;
    };

    describe('PostgresSpaceRepository', (): void => {
        it('findAll returns the 4 seeded spaces with their availability windows', async (): Promise<void> => {
            const spaces: Space[] = await spaceRepository.findAll();
            expect(spaces).toHaveLength(4);
            expect(spaces.map((space: Space): string => space.name).sort()).toEqual([...SEEDED_SPACE_NAMES].sort());
            for (const space of spaces) {
                expect(space.isActive).toBe(true);
                expect(space.basePrice.currency).toBe('PEN');
                expect(space.availabilityWindows.length).toBeGreaterThan(0);
                for (const window of space.availabilityWindows) {
                    expect(window.end.getTime()).toBeGreaterThan(window.start.getTime());
                }
            }
        });

        it('findById returns the space with its windows', async (): Promise<void> => {
            const space: Space | null = await spaceRepository.findById(SpaceId.create(SEEDED_CANCHA_ID));
            if (space === null) {
                throw new Error('seeded space not found');
            }
            expect(space.id.value).toBe(SEEDED_CANCHA_ID);
            expect(space.name).toBe('Cancha de Veteranos Miraflores');
            expect(space.type).toBe('CANCHA_FUTBOL');
            expect(space.capacity).toBe(22);
            expect(space.basePrice.amount).toBe(100);
            expect(space.basePrice.currency).toBe('PEN');
            expect(space.isActive).toBe(true);
            expect(space.availabilityWindows.length).toBeGreaterThan(0);
        });

        it('findById returns null for an unknown id', async (): Promise<void> => {
            const space: Space | null = await spaceRepository.findById(SpaceId.create(randomUUID()));
            expect(space).toBeNull();
        });

        it('findByAvailability returns the space for a band inside a seeded window', async (): Promise<void> => {
            const window: TimeSlot = await randomWindowOf(SEEDED_CANCHA_ID);
            const band: TimeSlot = TimeSlot.create(
                new Date(window.start.getTime() + ONE_HOUR_MS),
                new Date(window.start.getTime() + 2 * ONE_HOUR_MS)
            );
            const available: Space[] = await spaceRepository.findByAvailability(band);
            expect(available.map((space: Space): string => space.id.value)).toContain(SEEDED_CANCHA_ID);
            for (const space of available) {
                expect(space.availabilityWindows.length).toBeGreaterThan(0);
            }
        });

        it('findByAvailability returns [] for a band outside every window', async (): Promise<void> => {
            const available: Space[] = await spaceRepository.findByAvailability(limaBandOutsideEveryWindow());
            expect(available).toEqual([]);
        });
    });

    describe('PostgresReservationRepository', (): void => {
        it('saves a reservation and reads it back by id and by user', async (): Promise<void> => {
            const window: TimeSlot = await randomWindowOf(SEEDED_PISTA_ID);
            const slot: TimeSlot = TimeSlot.create(
                new Date(window.start.getTime() + ONE_HOUR_MS),
                new Date(window.start.getTime() + 2 * ONE_HOUR_MS)
            );
            const userId: string = `user-pg-${randomUUID()}`;
            const reservation: Reservation = Reservation.create({
                spaceId: SpaceId.create(SEEDED_PISTA_ID),
                userId: userId,
                timeSlot: slot,
                cost: Cost.create(50.5, 'PEN'),
                role: UserRole.create('NEIGHBOR'),
            });
            await reservationRepository.save(reservation);

            const byId: Reservation | null = await reservationRepository.findById(reservation.id);
            if (byId === null) {
                throw new Error('reservation not found');
            }
            expect(byId.id.value).toBe(reservation.id.value);
            expect(byId.spaceId.value).toBe(SEEDED_PISTA_ID);
            expect(byId.userId).toBe(userId);
            expect(byId.role.value).toBe('NEIGHBOR');
            expect(byId.cost.amount).toBe(50.5);
            expect(byId.cost.currency).toBe('PEN');
            expect(byId.isActive).toBe(true);
            expect(byId.timeSlot.start.toISOString()).toBe(slot.start.toISOString());
            expect(byId.timeSlot.end.toISOString()).toBe(slot.end.toISOString());

            const byUser: Reservation[] = await reservationRepository.findByUserId(userId);
            expect(byUser.map((entry: Reservation): string => entry.id.value)).toContain(reservation.id.value);
        });

        it('an overlapping save throws ReservationConflictException', async (): Promise<void> => {
            const window: TimeSlot = await randomWindowOf(SEEDED_LOSA_ID);
            const slot: TimeSlot = TimeSlot.create(
                new Date(window.start.getTime() + ONE_HOUR_MS),
                new Date(window.start.getTime() + 2 * ONE_HOUR_MS)
            );
            const first: Reservation = Reservation.create({
                spaceId: SpaceId.create(SEEDED_LOSA_ID),
                userId: `user-pg-${randomUUID()}`,
                timeSlot: slot,
                cost: Cost.create(40, 'PEN'),
                role: UserRole.create('NEIGHBOR'),
            });
            await reservationRepository.save(first);

            const overlapping: Reservation = Reservation.create({
                spaceId: SpaceId.create(SEEDED_LOSA_ID),
                userId: `user-pg-${randomUUID()}`,
                timeSlot: slot,
                cost: Cost.create(40, 'PEN'),
                role: UserRole.create('NEIGHBOR'),
            });
            await expect(reservationRepository.save(overlapping)).rejects.toThrow(ReservationConflictException);
            await expect(reservationRepository.save(overlapping)).rejects.toMatchObject({
                code: 'RESERVATION_CONFLICT',
            });
        });

        it('a touching-but-not-overlapping slot succeeds', async (): Promise<void> => {
            const window: TimeSlot = await randomWindowOf(SEEDED_MULTIUSOS_ID);
            const firstSlot: TimeSlot = TimeSlot.create(
                new Date(window.start.getTime() + ONE_HOUR_MS),
                new Date(window.start.getTime() + 2 * ONE_HOUR_MS)
            );
            const touchingSlot: TimeSlot = TimeSlot.create(
                new Date(window.start.getTime() + 2 * ONE_HOUR_MS),
                new Date(window.start.getTime() + 3 * ONE_HOUR_MS)
            );
            const first: Reservation = Reservation.create({
                spaceId: SpaceId.create(SEEDED_MULTIUSOS_ID),
                userId: `user-pg-${randomUUID()}`,
                timeSlot: firstSlot,
                cost: Cost.create(150, 'PEN'),
                role: UserRole.create('NEIGHBOR'),
            });
            const touching: Reservation = Reservation.create({
                spaceId: SpaceId.create(SEEDED_MULTIUSOS_ID),
                userId: `user-pg-${randomUUID()}`,
                timeSlot: touchingSlot,
                cost: Cost.create(150, 'PEN'),
                role: UserRole.create('NEIGHBOR'),
            });
            await reservationRepository.save(first);
            await expect(reservationRepository.save(touching)).resolves.toBeUndefined();

            const stored: Reservation | null = await reservationRepository.findById(touching.id);
            if (stored === null) {
                throw new Error('touching reservation not found');
            }
            expect(stored.timeSlot.start.toISOString()).toBe(touchingSlot.start.toISOString());
        });
    });

    describe('PostgresIncidentRepository', (): void => {
        it('saves an incident and reads it back by id and by space', async (): Promise<void> => {
            const incident: Incident = Incident.create({
                spaceId: SpaceId.create(SEEDED_LOSA_ID),
                reporterId: `user-pg-${randomUUID()}`,
                description: 'Broken hoop',
            });
            await incidentRepository.save(incident);

            const byId: Incident | null = await incidentRepository.findById(incident.id);
            if (byId === null) {
                throw new Error('incident not found');
            }
            expect(byId.id.value).toBe(incident.id.value);
            expect(byId.spaceId.value).toBe(SEEDED_LOSA_ID);
            expect(byId.reporterId).toBe(incident.reporterId);
            expect(byId.description).toBe('Broken hoop');
            expect(byId.getState()).toBe('UNDER_REVIEW');
            expect(byId.resolvedAt).toBeNull();

            const bySpace: Incident[] = await incidentRepository.findBySpaceId(SpaceId.create(SEEDED_LOSA_ID));
            expect(bySpace.map((entry: Incident): string => entry.id.value)).toContain(incident.id.value);
        });
    });

    describe('PostgresIdempotencyStore', (): void => {
        it('claims a key, then reports in_flight for the same hash and payload_mismatch for another', async (): Promise<void> => {
            const key: string = `key-${randomUUID()}`;
            const hash: string = sha256('payload-a');

            const first = await idempotencyStore.claim(key, hash);
            expect(first.outcome).toBe('claimed');

            const second = await idempotencyStore.claim(key, hash);
            expect(second.outcome).toBe('in_flight');

            const mismatch = await idempotencyStore.claim(key, sha256('payload-b'));
            expect(mismatch.outcome).toBe('payload_mismatch');
        });

        it('replays the stored response after complete()', async (): Promise<void> => {
            const key: string = `key-${randomUUID()}`;
            const hash: string = sha256('payload-c');
            const body: { readonly id: string; readonly status: string } = {
                id: randomUUID(),
                status: 'CREATED',
            };

            const claimed = await idempotencyStore.claim(key, hash);
            expect(claimed.outcome).toBe('claimed');

            await idempotencyStore.complete(key, 201, body);

            const replay = await idempotencyStore.claim(key, hash);
            expect(replay.outcome).toBe('replay');
            if (replay.outcome !== 'replay') {
                throw new Error(`expected a replay outcome, got: ${replay.outcome}`);
            }
            expect(replay.status).toBe(201);
            expect(replay.body).toEqual(body);
        });
    });
});
