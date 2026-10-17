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
