export class ReservationId {
    private constructor(public readonly value: string) {}

    static create(value: string): ReservationId {
        if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
            throw new Error('must be a valid UUID');
        }
        return Object.freeze(new ReservationId(value));
    }
}