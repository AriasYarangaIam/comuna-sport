/// <reference types="node" />
/// <reference types="jest" />

import { InMemorySpaceRepository } from "../../src/infrastructure/persistence/in-memory/space.in-memory.repository";
import { TimeSlot } from "../../src/domain/value-objects/time-slot.vo";
import type { Space } from "../../src/domain/entities/space.entity";

// The reference catalog is a ROLLING 30-day window (DATABASE.md §8), anchored on
// the current America/Lima business day. This suite pins the in-memory half of
// that contract hermetically — it never touches a database.
const CATALOG_DAYS: number = 30;

// America/Lima has no DST (UTC-05:00 all year round), so a business wall clock
// converts to UTC with a fixed offset — the same convention the e2e and
// postgres suites already use.
const LIMA_OFFSET_MS: number = -5 * 60 * 60 * 1000;

interface LimaDay {
    readonly year: number;
    readonly month: number;
    readonly day: number;
}

const limaToday = (): LimaDay => {
    const parts: string[] = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })
        .format(new Date())
        .split('-');
    const year: number = Number(parts[0]);
    const month: number = Number(parts[1]);
    const day: number = Number(parts[2]);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
        throw new Error('could not resolve the America/Lima calendar day');
    }
    return { year: year, month: month, day: day };
};

// Calendar arithmetic on the business calendar: adding days to a Lima day never
// depends on the wall clock or on a timezone.
const addDays = (day: LimaDay, days: number): LimaDay => {
    const cursor: Date = new Date(Date.UTC(day.year, day.month - 1, day.day + days));
    return {
        year: cursor.getUTCFullYear(),
        month: cursor.getUTCMonth() + 1,
        day: cursor.getUTCDate(),
    };
};

// A wall-clock band on a business day, expressed as the TimeSlot the port takes.
const limaBand = (day: LimaDay, startHour: number, endHour: number): TimeSlot => {
    const start: Date = new Date(
        Date.UTC(day.year, day.month - 1, day.day, startHour, 0, 0) - LIMA_OFFSET_MS
    );
    const end: Date = new Date(
        Date.UTC(day.year, day.month - 1, day.day, endHour, 0, 0) - LIMA_OFFSET_MS
    );
    return TimeSlot.create(start, end);
};

const limaDateKey = (instant: Date): string =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(instant);

// 10:00–11:00 sits inside every seeded band (the earliest opens at 06:00 and the
// latest closes at 23:00), so a match count of 4 means "every seeded space".
const ALL_SPACES_BAND_START_HOUR: number = 10;
const ALL_SPACES_BAND_END_HOUR: number = 11;

const spaceIds = (spaces: readonly Space[]): string[] =>
    spaces.map((space: Space): string => space.id.value).sort();

describe('In-memory space repository — reference catalog horizon', (): void => {
    let repository: InMemorySpaceRepository;

    beforeEach((): void => {
        repository = new InMemorySpaceRepository();
    });

    it('exposes one availability window per business day for the next 30 days', async (): Promise<void> => {
        const spaces: Space[] = await repository.findAll();
        expect(spaces).toHaveLength(4);
        for (const space of spaces) {
            expect(space.availabilityWindows).toHaveLength(CATALOG_DAYS);
        }
    });

    it('starts the catalog on the current America/Lima business day', async (): Promise<void> => {
        const spaces: Space[] = await repository.findAll();
        const today: LimaDay = limaToday();
        for (const space of spaces) {
            const first = space.availabilityWindows[0];
            if (first === undefined) {
                throw new Error(`space has no availability window: ${space.name}`);
            }
            expect(limaDateKey(first.start)).toBe(
                `${today.year}-${String(today.month).padStart(2, '0')}-${String(today.day).padStart(2, '0')}`
            );
        }
    });

    it('covers 30 consecutive America/Lima business days', async (): Promise<void> => {
        const spaces: Space[] = await repository.findAll();
        const today: LimaDay = limaToday();
        const expectedKeys: string[] = [];
        for (let offset = 0; offset < CATALOG_DAYS; offset += 1) {
            const day: LimaDay = addDays(today, offset);
            expectedKeys.push(`${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`);
        }

        const space = spaces[0];
        if (space === undefined) {
            throw new Error('the catalog is empty');
        }
        const actualKeys: string[] = space.availabilityWindows.map(
            (window): string => limaDateKey(window.start)
        );
        expect(actualKeys).toEqual(expectedKeys);
    });

    it('opens the first window of each space at its own America/Lima hour', async (): Promise<void> => {
        const spaces: Space[] = await repository.findAll();
        const today: LimaDay = limaToday();
        const openingHours: ReadonlyMap<string, number> = new Map<string, number>([
            ['Cancha de Veteranos Miraflores', 8],
            ['Losas Comunitarias Barranco', 7],
            ['Pista Comunal Barranco', 9],
            ['Multiusos San Isidro', 6],
        ]);

        for (const space of spaces) {
            const openingHour: number | undefined = openingHours.get(space.name);
            if (openingHour === undefined) {
                throw new Error(`unexpected seeded space: ${space.name}`);
            }
            const first = space.availabilityWindows[0];
            if (first === undefined) {
                throw new Error(`space has no availability window: ${space.name}`);
            }
            const expected: Date = new Date(
                Date.UTC(today.year, today.month - 1, today.day, openingHour, 0, 0) - LIMA_OFFSET_MS
            );
            expect(first.start.toISOString()).toBe(expected.toISOString());
        }
    });

    it('matches a slot on the current America/Lima business day', async (): Promise<void> => {
        const band: TimeSlot = limaBand(limaToday(), ALL_SPACES_BAND_START_HOUR, ALL_SPACES_BAND_END_HOUR);
        const available: Space[] = await repository.findByAvailability(band);
        expect(available).toHaveLength(4);
    });

    it('matches a slot one business day ahead', async (): Promise<void> => {
        const band: TimeSlot = limaBand(
            addDays(limaToday(), 1),
            ALL_SPACES_BAND_START_HOUR,
            ALL_SPACES_BAND_END_HOUR
        );
        const available: Space[] = await repository.findByAvailability(band);
        expect(available).toHaveLength(4);
    });

    it('matches a slot 29 business days ahead', async (): Promise<void> => {
        const band: TimeSlot = limaBand(
            addDays(limaToday(), 29),
            ALL_SPACES_BAND_START_HOUR,
            ALL_SPACES_BAND_END_HOUR
        );
        const available: Space[] = await repository.findByAvailability(band);
        expect(available).toHaveLength(4);
    });

    it('matches no space 30 business days ahead — the horizon ends at 29 days', async (): Promise<void> => {
        const band: TimeSlot = limaBand(
            addDays(limaToday(), 30),
            ALL_SPACES_BAND_START_HOUR,
            ALL_SPACES_BAND_END_HOUR
        );
        const available: Space[] = await repository.findByAvailability(band);
        expect(available).toEqual([]);
    });

    it('matches no space outside every band (05:00–06:00 America/Lima)', async (): Promise<void> => {
        const band: TimeSlot = limaBand(limaToday(), 5, 6);
        const available: Space[] = await repository.findByAvailability(band);
        expect(available).toEqual([]);
    });

    it('returns the same space ids from findByAvailability and findAll', async (): Promise<void> => {
        const band: TimeSlot = limaBand(limaToday(), ALL_SPACES_BAND_START_HOUR, ALL_SPACES_BAND_END_HOUR);
        const available: Space[] = await repository.findByAvailability(band);
        const all: Space[] = await repository.findAll();
        expect(spaceIds(available)).toEqual(spaceIds(all));
    });
});
