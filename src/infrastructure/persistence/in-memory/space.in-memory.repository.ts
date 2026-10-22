import { Cost } from "../../../domain/value-objects/cost.vo";
import { Space } from "../../../domain/entities/space.entity";
import type { SpaceType } from "../../../domain/entities/space.entity";
import { SpaceReader, SpaceWriter } from "../../../domain/repositories/space.repository";
import { SpaceId } from "../../../domain/value-objects/space-id.vo";
import { BUSINESS_TIME_ZONE, TimeSlot } from "../../../domain/value-objects/time-slot.vo";

// DATABASE.md §8 pins the reference catalog to a rolling horizon: one window per
// space per business day, from the current America/Lima business day through the
// next 29 days. The anchor and the arithmetic must follow the business calendar,
// never the host machine's local calendar.
const CATALOG_HORIZON_DAYS: number = 30;

interface BusinessDay {
    readonly year: number;
    readonly month: number;
    readonly day: number;
}

// 'en-CA' formats as YYYY-MM-DD, a parseable calendar key in the business zone.
const businessDayFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

// hourCycle h23 keeps midnight as 00 so the wall clock can be rebuilt as a UTC
// timestamp without an AM/PM ambiguity.
const businessWallClockFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});

const currentBusinessDay = (now: Date): BusinessDay => {
    const parts: string[] = businessDayFormatter.format(now).split('-');
    const year: number = Number(parts[0]);
    const month: number = Number(parts[1]);
    const day: number = Number(parts[2]);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
        throw new Error('could not resolve the business calendar day');
    }
    return { year: year, month: month, day: day };
};

// Calendar arithmetic on the business calendar: the day fields ride a UTC cursor
// used as a pure date counter, so adding days never depends on the wall clock or
// on the host timezone.
const addBusinessDays = (day: BusinessDay, days: number): BusinessDay => {
    const cursor: Date = new Date(Date.UTC(day.year, day.month - 1, day.day + days));
    return {
        year: cursor.getUTCFullYear(),
        month: cursor.getUTCMonth() + 1,
        day: cursor.getUTCDate(),
    };
};

const wallClockPart = (parts: readonly Intl.DateTimeFormatPart[], type: string): number => {
    const part: Intl.DateTimeFormatPart | undefined = parts.find(
        (candidate: Intl.DateTimeFormatPart): boolean => candidate.type === type
    );
    if (part === undefined) {
        throw new Error(`the business wall clock has no ${type} part`);
    }
    return Number(part.value);
};

// Offset of the business zone at an instant: the zone's wall clock rebuilt as a
// UTC timestamp minus the instant itself. Deriving it from Intl keeps the zone
// name as the single hardcoded fact, so a DST transition would still resolve.
const businessOffsetMs = (instantMs: number): number => {
    const parts: Intl.DateTimeFormatPart[] = businessWallClockFormatter.formatToParts(new Date(instantMs));
    const wallClockMs: number = Date.UTC(
        wallClockPart(parts, 'year'),
        wallClockPart(parts, 'month') - 1,
        wallClockPart(parts, 'day'),
        wallClockPart(parts, 'hour'),
        wallClockPart(parts, 'minute'),
        wallClockPart(parts, 'second')
    );
    return wallClockMs - instantMs;
};

// A business-day wall clock as a UTC instant. The candidate reads the wall clock
// as if it were UTC, so the offset resolved there can straddle a transition; the
// offset is re-resolved once at the corrected instant to land on the real one.
const businessWallClockToUtc = (day: BusinessDay, hour: number): Date => {
    const candidateMs: number = Date.UTC(day.year, day.month - 1, day.day, hour, 0, 0);
    const correctedMs: number = candidateMs - businessOffsetMs(candidateMs);
    return new Date(candidateMs - businessOffsetMs(correctedMs));
};

const buildAvailabilityWindow = (day: BusinessDay, startHour: number, endHour: number): TimeSlot =>
    TimeSlot.create(businessWallClockToUtc(day, startHour), businessWallClockToUtc(day, endHour));

// One window per business day across the rolling catalog horizon, each opening
// and closing at the space's own business-day wall-clock hours.
const buildAvailabilityWindows = (startHour: number, endHour: number): TimeSlot[] => {
    const today: BusinessDay = currentBusinessDay(new Date());
    const windows: TimeSlot[] = [];
    for (let offset: number = 0; offset < CATALOG_HORIZON_DAYS; offset += 1) {
        windows.push(buildAvailabilityWindow(addBusinessDays(today, offset), startHour, endHour));
    }
    return windows;
};

interface SpaceSeedSpec {
    readonly name: string;
    readonly type: SpaceType;
    readonly capacity: number;
    readonly basePrice: number;
    readonly startHour: number;
    readonly endHour: number;
}

const SPACE_SEEDS: readonly SpaceSeedSpec[] = [
    { name: 'Cancha de Veteranos Miraflores', type: 'CANCHA_FUTBOL', capacity: 22, basePrice: 100, startHour: 8, endHour: 22 },
    { name: 'Losas Comunitarias Barranco', type: 'LOSA_BASQUET', capacity: 10, basePrice: 40, startHour: 7, endHour: 21 },
    { name: 'Pista Comunal Barranco', type: 'PISTA_TENIS', capacity: 4, basePrice: 50.5, startHour: 9, endHour: 23 },
    { name: 'Multiusos San Isidro', type: 'MULTIPROPOSITO', capacity: 50, basePrice: 150, startHour: 6, endHour: 23 },
];

export class InMemorySpaceRepository implements SpaceReader, SpaceWriter {
    private readonly storage: Map<string, Space> = new Map<string, Space>();

    public constructor() {
        this.seed();
    }

    // Seeds 4 spaces with varied types, capacities, base prices (PEN) and a
    // 30-day rolling availability horizon anchored on the current business day,
    // so findByAvailability agrees with the PostgreSQL catalog (DATABASE.md §8).
    // The horizon is materialised at startup; restarts refresh it.
    private seed(): void {
        for (const spec of SPACE_SEEDS) {
            const space: Space = Space.create({
                name: spec.name,
                type: spec.type,
                capacity: spec.capacity,
                basePrice: Cost.create(spec.basePrice, 'PEN'),
                availabilityWindows: buildAvailabilityWindows(spec.startHour, spec.endHour),
            });
            this.storage.set(space.id.value, space);
        }
    }

    public async findById(id: SpaceId): Promise<Space | null> {
        const found: Space | undefined = this.storage.get(id.value);
        return found === undefined ? null : found;
    }

    public async findAll(): Promise<Space[]> {
        // DATABASE.md §7: SpaceReader.findAll → WHERE is_active.
        return [...this.storage.values()].filter((space: Space): boolean => space.isActive);
    }

    public async findByAvailability(timeSlot: TimeSlot): Promise<Space[]> {
        return [...this.storage.values()].filter(
            (space: Space): boolean => space.isActive && space.isSlotWithinAvailability(timeSlot)
        );
    }

    public async save(space: Space): Promise<void> {
        this.storage.set(space.id.value, space);
    }
}
