import { ReservationId } from "../value-objects/reservation-id.vo";
import { SpaceId } from "../value-objects/space-id.vo";
import { Cost } from "../value-objects/cost.vo";
import { TimeSlot } from "../value-objects/time-slot.vo";

export class ReservationConfirmedEvent {
    public readonly type = 'ReservationConfirmed' as const;
    public readonly occurredOn: Date;
    public readonly reservationId: ReservationId;
    public readonly spaceId: SpaceId;
    public readonly userId: string;
    public readonly cost: Cost;
    public readonly timeSlot: TimeSlot;

    public constructor(params: {
        reservationId: ReservationId;
        spaceId: SpaceId;
        userId: string;
        cost: Cost;
        timeSlot: TimeSlot;
    }) {
        this.occurredOn = new Date();
        this.reservationId = params.reservationId;
        this.spaceId = params.spaceId;
        this.userId = params.userId;
        this.cost = params.cost;
        this.timeSlot = params.timeSlot;
        Object.freeze(this);
    }
}
