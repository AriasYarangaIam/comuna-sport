/// <reference types="node" />
/// <reference types="jest" />

import { randomUUID } from "crypto";

import { Incident } from "../../src/domain/entities/incident.entity";
import { Reservation } from "../../src/domain/entities/reservation.entity";
import { Space } from "../../src/domain/entities/space.entity";
import { Cost } from "../../src/domain/value-objects/cost.vo";
import { ReservationId } from "../../src/domain/value-objects/reservation-id.vo";
import { SpaceId } from "../../src/domain/value-objects/space-id.vo";
import { TimeSlot } from "../../src/domain/value-objects/time-slot.vo";
import { UserRole } from "../../src/domain/value-objects/user-role.vo";

// All slots derive from ONE base date so every slot stays on the same local
// calendar day even if the suite runs across midnight.
const BASE: Date = new Date();

const slot = (startHour: number, endHour: number): TimeSlot => {
    const start: Date = new Date(BASE.getTime());
    start.setHours(startHour, 0, 0, 0);
    const end: Date = new Date(BASE.getTime());
    end.setHours(endHour, 0, 0, 0);
    return TimeSlot.create(start, end);
};

const makeSpace = (overrides?: Partial<Parameters<typeof Space.create>[0]>): Space =>
    Space.create({
        name: 'Cancha Comunal Test',
        type: 'CANCHA_FUTBOL',
        capacity: 10,
        basePrice: Cost.create(100, 'PEN'),
        availabilityWindows: [slot(8, 22)],
        ...overrides,
    });

const makeReservation = (overrides?: { readonly userId?: string }): Reservation =>
    Reservation.create({
        spaceId: SpaceId.create(randomUUID()),
        userId: overrides?.userId === undefined ? 'user-1' : overrides.userId,
        timeSlot: slot(10, 11),
        cost: Cost.fromCalculation(100),
        role: UserRole.create('NEIGHBOR'),
    });

const makeIncident = (): Incident => Incident.create({
    spaceId: SpaceId.create(randomUUID()),
    reporterId: 'user-1',
    description: 'Broken hoop',
});

describe('Space entity invariants', (): void => {
    it('constructs with valid params and generates a UUID v4 id', (): void => {
        const space: Space = makeSpace();
        expect(space.id.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect(space.isActive).toBe(true);
    });

    it('rejects an empty name (length 0)', (): void => {
        expect((): Space => makeSpace({ name: '' })).toThrow('The name must be between 1 and 200 characters long');
    });

    it('rejects a name longer than 200 characters (201)', (): void => {
        expect((): Space => makeSpace({ name: 'a'.repeat(201) })).toThrow('The name must be between 1 and 200 characters long');
    });

    it('accepts a name of exactly 200 characters', (): void => {
        expect(makeSpace({ name: 'a'.repeat(200) }).name).toHaveLength(200);
    });

    it('rejects empty availability windows', (): void => {
        expect((): Space => makeSpace({ availabilityWindows: [] })).toThrow('The availability windows must be greater');
    });

    it('rejects capacity 0', (): void => {
        expect((): Space => makeSpace({ capacity: 0 })).toThrow('The capacity must be greater than 0');
    });

    it('rejects negative capacity', (): void => {
        expect((): Space => makeSpace({ capacity: -3 })).toThrow('The capacity must be greater than 0');
    });

    it('isSlotWithinAvailability accepts a slot inside the window', (): void => {
        expect(makeSpace().isSlotWithinAvailability(slot(10, 11))).toBe(true);
    });

    it('isSlotWithinAvailability accepts a slot exactly spanning the window', (): void => {
        expect(makeSpace().isSlotWithinAvailability(slot(8, 22))).toBe(true);
    });

    it('isSlotWithinAvailability rejects a slot starting before the window', (): void => {
        expect(makeSpace().isSlotWithinAvailability(slot(7, 10))).toBe(false);
    });

    it('isSlotWithinAvailability rejects a slot ending after the window', (): void => {
        expect(makeSpace().isSlotWithinAvailability(slot(21, 23))).toBe(false);
    });

    it('isSlotWithinAvailability rejects a fully outside slot', (): void => {
        expect(makeSpace().isSlotWithinAvailability(slot(0, 1))).toBe(false);
    });

    it('deactivate flips isActive to false', (): void => {
        const space: Space = makeSpace();
        space.deactivate();
        expect(space.isActive).toBe(false);
    });

    it('double deactivate throws', (): void => {
        const space: Space = makeSpace();
        space.deactivate();
        expect((): void => space.deactivate()).toThrow('space already deactivate');
    });
});

describe('Reservation entity invariants', (): void => {
    it('create generates a UUID v4 id', (): void => {
        const reservation: Reservation = makeReservation();
        expect(reservation.id).toBeInstanceOf(ReservationId);
        expect(reservation.id.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('create starts active', (): void => {
        expect(makeReservation().isActive).toBe(true);
    });

    it('rejects an empty userId', (): void => {
        expect((): Reservation => makeReservation({ userId: '' })).toThrow('The user id does not accept empty value');
    });

    it('cancel sets isActive false through the getter', (): void => {
        const reservation: Reservation = makeReservation();
        reservation.cancel();
        expect(reservation.isActive).toBe(false);
    });

    it('double cancel throws', (): void => {
        const reservation: Reservation = makeReservation();
        reservation.cancel();
        expect((): void => reservation.cancel()).toThrow('reservation already cancelled');
    });

    it('create does not mutate creation defaults between calls', (): void => {
        const first: Reservation = makeReservation();
        const second: Reservation = makeReservation();
        expect(first.id.value).not.toBe(second.id.value);
        expect(first.isActive).toBe(true);
        expect(second.isActive).toBe(true);
    });
});

describe('Incident entity invariants', (): void => {
    it('create starts UNDER_REVIEW', (): void => {
        expect(makeIncident().getState()).toBe('UNDER_REVIEW');
    });

    it('resolvedAt is null until resolve', (): void => {
        const incident: Incident = makeIncident();
        expect(incident.resolvedAt).toBeNull();
        incident.approve();
        expect(incident.resolvedAt).toBeNull(); // approved but not yet resolved
        incident.resolve();
        expect(incident.resolvedAt).toBeInstanceOf(Date);
    });

    it('create generates a UUID v4 id', (): void => {
        expect(makeIncident().id.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('rejects a description longer than 2000 characters (2001)', (): void => {
        expect((): Incident => Incident.create({
            spaceId: SpaceId.create(randomUUID()),
            reporterId: 'user-1',
            description: 'x'.repeat(2001),
        })).toThrow('The description must contain between 1 and 2000 characters');
    });

    it('accepts a description of exactly 2000 characters', (): void => {
        const incident: Incident = Incident.create({
            spaceId: SpaceId.create(randomUUID()),
            reporterId: 'user-1',
            description: 'x'.repeat(2000),
        });
        expect(incident.description).toHaveLength(2000);
    });

    it('rejects an empty description', (): void => {
        expect((): Incident => Incident.create({
            spaceId: SpaceId.create(randomUUID()),
            reporterId: 'user-1',
            description: '',
        })).toThrow('The description must contain between 1 and 2000 characters');
    });

    it('rejects an empty reporterId', (): void => {
        expect((): Incident => Incident.create({
            spaceId: SpaceId.create(randomUUID()),
            reporterId: '',
            description: 'Broken hoop',
        })).toThrow('The reporter id does not accept empty value');
    });
});
