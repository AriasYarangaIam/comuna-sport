export interface SpaceReader {
    findById(id: SpaceId): Promise<Space | null>;
    findAll(): Promise<Space[]>;
    findByAvailability(timeslot: TimeSlot): Promise<Space[]>;
}

export interface SpaceWriter {
    save(space: Space): Promise<void>;
}