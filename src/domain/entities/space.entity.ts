import { Cost } from "../value-objects/cost.vo";
import { SpaceId } from "../value-objects/space-id.vo";
import { TimeSlot } from "../value-objects/time-slot.vo";

export type SpaceType = 'CANCHA_FUTBOL' | 'LOSA_BASQUET' | 'PISTA_TENIS' | 'MULTIPROPOSITO';

export class Space {
    private constructor(
        public readonly id: SpaceId,
        public readonly name: string,
        public readonly type: SpaceType,
        public readonly capacity: number,
        public readonly basePrice: Cost,
        public readonly availabilityWindows: TimeSlot[],
        private isActive: boolean = true
    ) {}

    static create(params: {
        name: string;
        type: SpaceType;
        capacity: number;
        basePrice: Cost;
        availabilityWindows: TimeSlot[];
    }): Space { 
        
        if(params.name.length < 1 || params.name.length > 200) {
            throw new Error('The name must be between 1 and 200 characters long');
        }
        if (params.capacity <= 0) {
            throw new Error('The capacity must be greater than 0');
        }
        if (params.availabilityWindows.length === 0) {
            throw new Error('The availability windows must be greater');
        }

        const id: SpaceId = SpaceId.create(crypto.randomUUID());

        return new Space(id,
            params.name,
            params.type,
            params.capacity,
            params.basePrice,
            params.availabilityWindows);
    }
    
    isSlotWithinAvailability(slot: TimeSlot): boolean {
        return this.availabilityWindows.some(w => 
            slot.start >= w.start && slot.end <= w.end
        );
    }

    deactivate(): void {
        if (!this.isActive) throw new Error('space already deactivate');
        this.isActive = false;
    }
}