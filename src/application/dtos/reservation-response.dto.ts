import type { Reservation } from "../../domain/entities/reservation.entity";
import type { UserRoleType } from "../../domain/value-objects/user-role.vo";

// S1/S4 (odd/tasks/privacy-identifiers-and-copy.md): the space is addressed by
// its public slug and the citizen DNI is never echoed — neither field of the
// old contract (spaceId, userId) survives.
export interface ReservationResponseDto {
    id: string;
    spaceSlug: string;
    role: UserRoleType;
    timeSlot: { start: string; end: string };
    cost: { amount: number; currency: string };
    createdAt: string;
    isActive: boolean;
}

// Single mapping point for the reservation read model — shared by the command
// handler (create) and the read handlers (get/list), so the HTTP shape can
// never drift between writes and reads. `spaceSlug` is resolved by the caller
// (the create flow already holds the space; the read flows resolve it through
// SpaceReader).
export const toReservationResponseDto = (reservation: Reservation, spaceSlug: string): ReservationResponseDto => {
    return {
        id: reservation.id.value,
        spaceSlug: spaceSlug,
        role: reservation.role.value,
        timeSlot: {
            start: reservation.timeSlot.start.toISOString(),
            end: reservation.timeSlot.end.toISOString()
        },
        cost: {
            amount: reservation.cost.amount,
            currency: reservation.cost.currency
        },
        createdAt: reservation.createdAt.toISOString(),
        isActive: reservation.isActive
    };
};
