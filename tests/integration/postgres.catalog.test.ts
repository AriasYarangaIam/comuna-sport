/// <reference types="node" />
/// <reference types="jest" />

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Pool } from "pg";

import { InMemorySpaceRepository } from "../../src/infrastructure/persistence/in-memory/space.in-memory.repository";
import { PostgresSpaceRepository } from "../../src/infrastructure/persistence/postgres/space.postgres.repository";
import { closePool, createPool } from "../../src/infrastructure/persistence/postgres/pool";
import { TimeSlot } from "../../src/domain/value-objects/time-slot.vo";
import type { Space } from "../../src/domain/entities/space.entity";
import { connectionString, describeWithDatabase } from "./support/with-database";

const CATALOG_DAYS: number = 30;

// America/Lima has no DST (UTC-05:00 all year round), so a business wall clock
// converts to UTC with a fixed offset.
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
    })
        .format(date)
        .split('-');
    return { year: Number(parts[0]), month: Number(parts[1]), day: Number(parts[2]) };
};

const addDays = (day: LimaDay, days: number): LimaDay => {
    const cursor: Date = new Date(Date.UTC(day.year, day.month - 1, day.day + days));
    return {
        year: cursor.getUTCFullYear(),
        month: cursor.getUTCMonth() + 1,
        day: cursor.getUTCDate(),
    };
};

const limaBand = (day: LimaDay, startHour: number, endHour: number): TimeSlot => {
    const start: Date = new Date(
        Date.UTC(day.year, day.month - 1, day.day, startHour, 0, 0) - LIMA_OFFSET_MS
    );
    const end: Date = new Date(
        Date.UTC(day.year, day.month - 1, day.day, endHour, 0, 0) - LIMA_OFFSET_MS
    );
    return TimeSlot.create(start, end);
};

const dayKey = (day: LimaDay): string =>
    `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;

const compareDays = (left: LimaDay, right: LimaDay): number => {
    const leftKey: string = dayKey(left);
    const rightKey: string = dayKey(right);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
};

const maxDay = (left: LimaDay, right: LimaDay): LimaDay => (compareDays(left, right) >= 0 ? left : right);
const minDay = (left: LimaDay, right: LimaDay): LimaDay => (compareDays(left, right) <= 0 ? left : right);

const daysBetween = (from: LimaDay, to: LimaDay): number =>
    Math.round(
        (Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86400000
    );

const parseDayKey = (key: string): LimaDay => {
    const parts: string[] = key.split('-');
    return { year: Number(parts[0]), month: Number(parts[1]), day: Number(parts[2]) };
};

const spaceNames = (spaces: readonly Space[]): string[] =>
    spaces.map((space: Space): string => space.name).sort();

const SEED_FILE: string = join(__dirname, '..', '..', 'db', 'migrations', '002_seed_spaces.sql');

// A fixed instant whose UTC date is ALREADY one day ahead of its America/Lima
// date: 2026-01-15 21:30 UTC is 2026-01-15 16:30 in Lima (UTC-05:00). A
// UTC-anchored seed would therefore open the catalog on 2026-01-16; a
// Lima-anchored seed opens it on 2026-01-15.
const PINNED_INSTANT_UTC: string = '2026-01-15 21:30:00+00';
const PINNED_LIMA_DAY: string = '2026-01-15';

describeWithDatabase('Seeded catalog business-day anchor', (): void => {
    let pool: Pool;

    beforeAll((): void => {
        pool = createPool(connectionString);
    });

    afterAll(async (): Promise<void> => {
        await closePool(pool);
    });

    it('derives the seed day range from now()', (): void => {
        const seedSql: string = readFileSync(SEED_FILE, 'utf8');
        const pinnedSql: string = seedSql.replace(/now\(\)/g, `'${PINNED_INSTANT_UTC}'`);
        expect(pinnedSql).not.toBe(seedSql);
        expect(pinnedSql).not.toContain('now()');
    });

    it('opens the catalog on the America/Lima business day of the seed instant', async (): Promise<void> => {
        const seedSql: string = readFileSync(SEED_FILE, 'utf8');
        const pinnedSql: string = seedSql.replace(/now\(\)/g, `'${PINNED_INSTANT_UTC}'`);
        expect(pinnedSql).not.toBe(seedSql);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            try {
                await client.query(pinnedSql);
                const result = await client.query(
                    "SELECT min((window_start AT TIME ZONE 'America/Lima')::date)::text AS first_day, " +
                    "count(DISTINCT (window_start AT TIME ZONE 'America/Lima')::date)::int AS days " +
                    'FROM space_availability_windows'
                );
                const row = result.rows[0] as { readonly first_day: string; readonly days: number };
                expect(row.first_day).toBe(PINNED_LIMA_DAY);
                expect(row.days).toBe(CATALOG_DAYS);
            } finally {
                await client.query('ROLLBACK');
            }
        } finally {
            client.release();
        }
    });

    it('covers the current America/Lima business day', async (): Promise<void> => {
        const result = await pool.query(
            "SELECT count(*)::int AS c FROM space_availability_windows " +
            "WHERE (window_start AT TIME ZONE 'America/Lima')::date = (now() AT TIME ZONE 'America/Lima')::date"
        );
        expect(result.rows[0].c).toBeGreaterThan(0);
    });
});

describeWithDatabase('Adapter parity for SpaceReader.findByAvailability', (): void => {
    let pool: Pool;

    beforeAll((): void => {
        pool = createPool(connectionString);
    });

    afterAll(async (): Promise<void> => {
        await closePool(pool);
    });

    it('selects the same spaces on every business day both adapters share', async (): Promise<void> => {
        const postgresRepository = new PostgresSpaceRepository(pool);
        const inMemoryRepository = new InMemorySpaceRepository();

        const range = await pool.query(
            "SELECT min((window_start AT TIME ZONE 'America/Lima')::date)::text AS first_day, " +
            "max((window_start AT TIME ZONE 'America/Lima')::date)::text AS last_day " +
            'FROM space_availability_windows'
        );
        const row = range.rows[0] as { readonly first_day: string; readonly last_day: string };
        const databaseFirst: LimaDay = parseDayKey(row.first_day);
        const databaseLast: LimaDay = parseDayKey(row.last_day);

        const memorySpaces: Space[] = await inMemoryRepository.findAll();
        const firstWindow = memorySpaces[0]?.availabilityWindows[0];
        const lastWindow =
            memorySpaces[0]?.availabilityWindows[memorySpaces[0]?.availabilityWindows.length - 1];
        if (firstWindow === undefined || lastWindow === undefined) {
            throw new Error('the in-memory catalog has no availability window');
        }
        const memoryFirst: LimaDay = limaDay(firstWindow.start);
        const memoryLast: LimaDay = limaDay(lastWindow.start);

        // The two catalogs overlap on [max(first), min(last)]. A seed older than
        // 30 days leaves no overlap — that is a stale catalog, not a parity bug.
        const overlapFirst: LimaDay = maxDay(databaseFirst, memoryFirst);
        const overlapLast: LimaDay = minDay(databaseLast, memoryLast);
        if (compareDays(overlapFirst, overlapLast) > 0) {
            throw new Error(
                'the seeded catalog does not overlap the in-memory catalog — run `pnpm db:seed` to refresh it'
            );
        }

        const probeDays: LimaDay[] = [
            overlapFirst,
            addDays(overlapFirst, Math.floor(daysBetween(overlapFirst, overlapLast) / 2)),
            overlapLast,
        ];

        for (const probeDay of probeDays) {
            const band: TimeSlot = limaBand(probeDay, 10, 11);
            const fromPostgres: Space[] = await postgresRepository.findByAvailability(band);
            const fromMemory: Space[] = await inMemoryRepository.findByAvailability(band);
            expect(spaceNames(fromMemory)).toEqual(spaceNames(fromPostgres));
            expect(fromPostgres.length).toBeGreaterThan(0);
        }
    });
});
