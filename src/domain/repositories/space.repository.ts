import { Space } from "../entities/space.entity";
import { TimeSlot } from "../value-objects/time-slot.vo";
import { SpaceId } from "../value-objects/space-id.vo";

export interface SpaceReader {
    findById(id: SpaceId): Promise<Space | null>;
    findAll(): Promise<Space[]>;
    findByAvailability(timeSlot: TimeSlot): Promise<Space[]>;
}

export interface SpaceWriter {
    save(space: Space): Promise<void>;
}
