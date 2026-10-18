import { Reservation } from "../entities/reservation.entity";
import { SpaceId } from "../value-objects/space-id.vo";
import { TimeSlot } from "../value-objects/time-slot.vo";
import { ReservationId } from "../value-objects/reservation-id.vo";

export interface ReservationReader {
    findById(id: ReservationId): Promise<Reservation | null>;
    findBySpaceAndSlot(spaceId: SpaceId, slot: TimeSlot): Promise<Reservation | null>;
    findByUserId(userId: string): Promise<Reservation[]>;
}

export interface ReservationWriter {
    save(reservation: Reservation): Promise<void>;
}
