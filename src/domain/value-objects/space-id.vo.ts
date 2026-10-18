export class SpaceId {
    // Phantom brand (DEVELOPMENT.md principle #6, `string & { readonly
    // __brand: 'SpaceId' }` form): a declared-only field typed with THIS id's
    // literal makes SpaceId NOT assignable to any other ID VO (e.g. not to
    // ReservationId). Emits no runtime code — zero behavior change. Public
    // (not private) because Object.freeze's Readonly<T> mapped type strips
    // private members and would break the create() return type.
    public declare readonly __brand: 'SpaceId';

    private constructor(public readonly value: string) {}

    static create(value: string): SpaceId {
        if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
            throw new Error('must be a valid UUID');
        }
        return Object.freeze(new SpaceId(value));
    }
}