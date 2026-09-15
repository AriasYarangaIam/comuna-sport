class ReservationConflictException extends Error {
    public constructor(
        public readonly code: string = 'RESERVATION_CONFLICT',
        message: string
    ) {
        super(message);
        this.name = 'ReservationConflictException';
    }
}