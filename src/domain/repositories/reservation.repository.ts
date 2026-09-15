export interface ReservationReader {
    findById(id: ReservationId): Promise<Reservation | null>;
    findBySpaceAndSlot(space: SpaceId, slot: TimeSlot): Promise<Reservation | null>;
    findByUserId(userId: string): Promise<Reservation[]>;
}

export interface ReservationWriter {
    save(reservation: Reservation): Promise<void>;
}