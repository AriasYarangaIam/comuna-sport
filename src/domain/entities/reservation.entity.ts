import { Cost } from "../value-objects/cost.vo";
import { ReservationId } from "../value-objects/reservation-id.vo";
import { SpaceId } from "../value-objects/space-id.vo";
import { TimeSlot } from "../value-objects/time-slot.vo";
import { UserRole } from "../value-objects/user-role.vo";

export class Reservation {
    private constructor(
        public readonly id: ReservationId,
        public readonly spaceId: SpaceId,
        public readonly userId: string,
        public readonly timeSlot: TimeSlot,
        public readonly cost: Cost,
        public readonly role: UserRole,
        public readonly createdAt: Date,
        private isActive: boolean = true
    ) {}

    static create(params: {
        spaceId: SpaceId,
        userId: string,
        timeSlot: TimeSlot,
        cost: Cost,
        role: UserRole
    }): Reservation {

        if(params.userId.length < 1) throw new Error('The user id does not accept empty value');

        const id: ReservationId = ReservationId.create(crypto.randomUUID());
        const date: Date = new Date();

        return new Reservation(id,
            params.spaceId,
            params.userId,
            params.timeSlot,
            params.cost,
            params.role,
            date
        );
    }

    cancel(): void {
        if (!this.isActive) throw new Error('reservation already cancelled');
        this.isActive = false;
    }
}