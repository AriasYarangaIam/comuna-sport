export class ReservationConflictException extends Error {
    public constructor(
        message: string,
        public readonly code: string = 'RESERVATION_CONFLICT'
    ) {
        super(message);
        this.name = 'ReservationConflictException';
    }
}