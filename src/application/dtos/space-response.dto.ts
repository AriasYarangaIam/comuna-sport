import type { Space, SpaceType } from "../../domain/entities/space.entity";
import type { TimeSlot } from "../../domain/value-objects/time-slot.vo";

export interface SpaceResponseDto {
    id: string;
    name: string;
    type: SpaceType;
    capacity: number;
    basePrice: { amount: number; currency: string };
    isActive: boolean;
    availabilityWindows: { start: string; end: string }[];
}

// Windows keep the order the Space aggregate exposes them in; the timestamps
// become ISO 8601 strings so the HTTP payload stays JSON-safe.
export const toSpaceResponseDto = (space: Space): SpaceResponseDto => {
    return {
        id: space.id.value,
        name: space.name,
        type: space.type,
        capacity: space.capacity,
        basePrice: {
            amount: space.basePrice.amount,
            currency: space.basePrice.currency
        },
        isActive: space.isActive,
        availabilityWindows: space.availabilityWindows.map((window: TimeSlot): { start: string; end: string } => ({
            start: window.start.toISOString(),
            end: window.end.toISOString()
        }))
    };
};
