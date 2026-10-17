import { Reservation } from "../../../domain/entities/reservation.entity";
import { ReservationReader, ReservationWriter } from "../../../domain/repositories/reservation.repository";
import { ReservationId } from "../../../domain/value-objects/reservation-id.vo";
import { SpaceId } from "../../../domain/value-objects/space-id.vo";
import { TimeSlot } from "../../../domain/value-objects/time-slot.vo";

export class InMemoryReservationRepository implements ReservationReader, ReservationWriter {
    private readonly storage: Map<string, Reservation> = new Map<string, Reservation>();

    public async findById(id: ReservationId): Promise<Reservation | null> {
        const found: Reservation | undefined = this.storage.get(id.value);
        return found === undefined ? null : found;
    }

    // Optimistic-lock lookup: returns the ACTIVE reservation whose TimeSlot
    // overlaps (strict inequality — touching endpoints do NOT overlap) the slot
    // for the same space. Cancelled reservations do not block the slot.
    public async findBySpaceAndSlot(spaceId: SpaceId, slot: TimeSlot): Promise<Reservation | null> {
        for (const reservation of this.storage.values()) {
            const isSameSpace: boolean = reservation.spaceId.value === spaceId.value;
            if (isSameSpace && reservation.isActive && reservation.timeSlot.overlaps(slot)) {
                return reservation;
            }
        }
        return null;
    }

    public async findByUserId(userId: string): Promise<Reservation[]> {
        return [...this.storage.values()].filter((reservation: Reservation): boolean => reservation.userId === userId);
    }

    public async save(reservation: Reservation): Promise<void> {
        this.storage.set(reservation.id.value, reservation);
    }
}
