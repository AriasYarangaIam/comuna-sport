import type { Reservation } from "../../domain/entities/reservation.entity";
import type { UserRoleType } from "../../domain/value-objects/user-role.vo";

export interface ReservationResponseDto {
    id: string;
    spaceId: string;
    userId: string;
    role: UserRoleType;
    timeSlot: { start: string; end: string };
    cost: { amount: number; currency: string };
    createdAt: string;
    isActive: boolean;
}

// Single mapping point for the reservation read model — shared by the command
// handler (create) and the read handlers (get/list), so the HTTP shape can
// never drift between writes and reads.
export const toReservationResponseDto = (reservation: Reservation): ReservationResponseDto => {
    return {
        id: reservation.id.value,
        spaceId: reservation.spaceId.value,
        userId: reservation.userId,
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
