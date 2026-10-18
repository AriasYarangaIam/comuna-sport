import type { EventListener } from "../../../domain/events/domain-event.interface";
import type { ReservationConfirmedEvent } from "../../../domain/events/reservation-confirmed.event";

export class NotificationListener implements EventListener<ReservationConfirmedEvent> {
    public async handle(event: ReservationConfirmedEvent): Promise<void> {
        await new Promise<void>((resolve: () => void): void => {
            setTimeout(resolve, 100);
        });
        console.log(`[EMAIL] Reservation ${event.reservationId.value} confirmed for user ${event.userId}. Cost: ${event.cost.amount} ${event.cost.currency}`);
        console.log(`[PUSH] New reservation at space ${event.spaceId.value}: ${event.timeSlot.start} - ${event.timeSlot.end}`);
    }
}
