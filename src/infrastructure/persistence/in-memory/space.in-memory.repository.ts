import { Cost } from "../../../domain/value-objects/cost.vo";
import { Space } from "../../../domain/entities/space.entity";
import type { SpaceType } from "../../../domain/entities/space.entity";
import { SpaceReader, SpaceWriter } from "../../../domain/repositories/space.repository";
import { SpaceId } from "../../../domain/value-objects/space-id.vo";
import { TimeSlot } from "../../../domain/value-objects/time-slot.vo";

const buildAvailabilityWindow = (startHour: number, endHour: number): TimeSlot => {
    const start: Date = new Date();
    start.setHours(startHour, 0, 0, 0);
    const end: Date = new Date();
    end.setHours(endHour, 0, 0, 0);
    return TimeSlot.create(start, end);
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

    // Seeds 4 spaces with varied types, capacities, base prices (PEN) and
    // same-day availability windows. Windows are pinned to the local calendar
    // day at startup; restarts refresh them.
    private seed(): void {
        for (const spec of SPACE_SEEDS) {
            const space: Space = Space.create({
                name: spec.name,
                type: spec.type,
                capacity: spec.capacity,
                basePrice: Cost.create(spec.basePrice, 'PEN'),
                availabilityWindows: [buildAvailabilityWindow(spec.startHour, spec.endHour)],
            });
            this.storage.set(space.id.value, space);
        }
    }

    public async findById(id: SpaceId): Promise<Space | null> {
        const found: Space | undefined = this.storage.get(id.value);
        return found === undefined ? null : found;
    }

    public async findAll(): Promise<Space[]> {
        return [...this.storage.values()];
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
