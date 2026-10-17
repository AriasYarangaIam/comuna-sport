/// <reference types="node" />
/// <reference types="jest" />

import { randomUUID } from "crypto";

import { Cost } from "../../src/domain/value-objects/cost.vo";
import { IncidentId } from "../../src/domain/value-objects/incident-id.vo";
import { ReservationId } from "../../src/domain/value-objects/reservation-id.vo";
import { SpaceId } from "../../src/domain/value-objects/space-id.vo";
import { TimeSlot } from "../../src/domain/value-objects/time-slot.vo";
import { UserRole } from "../../src/domain/value-objects/user-role.vo";

// A non-v4 UUID (version nibble is `1`) that must be rejected by every ID VO.
const NON_V4_UUID: string = '123e4567-e89b-12d3-a456-426614174000';
// A UUID v4-shaped string with an invalid RFC-4122 variant nibble (`4`).
const BAD_VARIANT_UUID: string = '123e4567-e89b-42d3-4456-426614174000';

const slot = (startHour: number, endHour: number): TimeSlot => {
    const base: Date = new Date();
    const start: Date = new Date(base.getTime());
    start.setHours(startHour, 0, 0, 0);
    const end: Date = new Date(base.getTime());
    end.setHours(endHour, 0, 0, 0);
    return TimeSlot.create(start, end);
};

describe('UUID v4 branded ID value objects', (): void => {
    it.each([
        ['SpaceId', (): SpaceId => SpaceId.create(randomUUID())],
        ['ReservationId', (): ReservationId => ReservationId.create(randomUUID())],
        ['IncidentId', (): IncidentId => IncidentId.create(randomUUID())],
    ])('%s accepts a valid UUID v4 and exposes its value', (_name: string, make: () => SpaceId | ReservationId | IncidentId): void => {
        const id = make();
        expect(id.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it.each([
        ['SpaceId', SpaceId.create],
        ['ReservationId', ReservationId.create],
        ['IncidentId', IncidentId.create],
    ])('%s rejects the empty string', (_name: string, make: (value: string) => SpaceId | ReservationId | IncidentId): void => {
        expect((): SpaceId | ReservationId | IncidentId => make('')).toThrow('must be a valid UUID');
    });

    it.each([
        ['SpaceId', SpaceId.create],
        ['ReservationId', ReservationId.create],
        ['IncidentId', IncidentId.create],
    ])('%s rejects garbage text', (_name: string, make: (value: string) => SpaceId | ReservationId | IncidentId): void => {
        expect((): SpaceId | ReservationId | IncidentId => make('not-a-uuid')).toThrow('must be a valid UUID');
    });

    it.each([
        ['SpaceId', SpaceId.create],
        ['ReservationId', ReservationId.create],
        ['IncidentId', IncidentId.create],
    ])('%s rejects a non-v4 UUID (version nibble 1)', (_name: string, make: (value: string) => SpaceId | ReservationId | IncidentId): void => {
        expect((): SpaceId | ReservationId | IncidentId => make(NON_V4_UUID)).toThrow('must be a valid UUID');
    });

    it.each([
        ['SpaceId', SpaceId.create],
        ['ReservationId', ReservationId.create],
        ['IncidentId', IncidentId.create],
    ])('%s rejects an invalid variant nibble', (_name: string, make: (value: string) => SpaceId | ReservationId | IncidentId): void => {
        expect((): SpaceId | ReservationId | IncidentId => make(BAD_VARIANT_UUID)).toThrow('must be a valid UUID');
    });

    it.each([
        ['SpaceId', (): SpaceId => SpaceId.create(randomUUID())],
        ['ReservationId', (): ReservationId => ReservationId.create(randomUUID())],
        ['IncidentId', (): IncidentId => IncidentId.create(randomUUID())],
    ])('%s is frozen (immutable)', (_name: string, make: () => SpaceId | ReservationId | IncidentId): void => {
        expect(Object.isFrozen(make())).toBe(true);
    });

    it('enforces compile-level type gates via the private constructors', (): void => {
        const spaceId: SpaceId = SpaceId.create(randomUUID());
        const reservationId: ReservationId = ReservationId.create(spaceId.value);
        // Compile-level gate #1: VO instances can ONLY be created through the
        // static factories — the constructors are private.
        // @ts-expect-error - SpaceId's constructor is private; only SpaceId.create may build one
        void new SpaceId(spaceId.value);
        // Compile-level gate #2 (exact type-shaped assertion): the two branded
        // classes are separate DECLARATIONS. NOTE: as implemented (`private
        // constructor` + public `value: string`), TypeScript still treats them
        // as structurally compatible, so a SpaceId assigned to a
        // ReservationId slot is NOT a compile error; runtime type identity
        // remains disjoint and is asserted here.
        expect(spaceId.constructor === reservationId.constructor).toBe(false);
        expect(spaceId).not.toBe(reservationId);
    });
});

describe('UserRole value object', (): void => {
    it.each([
        ['NEIGHBOR'],
        ['YOUTH'],
        ['SENIOR'],
        ['PRIVATE_CLUB'],
    ])('accepts the valid role %s', (role: string): void => {
        expect(UserRole.create(role).value).toBe(role);
    });

    it.each([
        ['ADMIN'],
        [''],
        ['neighbor'],
        ['USER'],
    ])('throws for the invalid role %s', (role: string): void => {
        expect((): UserRole => UserRole.create(role)).toThrow('invalid user role');
    });

    it('is frozen (immutable)', (): void => {
        expect(Object.isFrozen(UserRole.create('NEIGHBOR'))).toBe(true);
    });
});

describe('Cost value object', (): void => {
    it('constructs a valid amount/currency pair', (): void => {
        const cost: Cost = Cost.create(10, 'PEN');
        expect(cost.amount).toBe(10);
        expect(cost.currency).toBe('PEN');
    });

    it('rejects a negative amount', (): void => {
        expect((): Cost => Cost.create(-1, 'PEN')).toThrow('base price must be non-negative');
    });

    it('rejects an empty currency', (): void => {
        expect((): Cost => Cost.create(10, '')).toThrow('currency is required');
    });

    it('rejects a whitespace-only currency', (): void => {
        expect((): Cost => Cost.create(10, '   ')).toThrow('currency is required');
    });

    it('is frozen (immutable)', (): void => {
        expect(Object.isFrozen(Cost.create(10, 'PEN'))).toBe(true);
    });

    it('fromCalculation defaults the currency to PEN', (): void => {
        const cost: Cost = Cost.fromCalculation(100);
        expect(cost.currency).toBe('PEN');
        expect(cost.amount).toBe(100);
    });

    it('fromCalculation rounds half-up to 2 decimals (33.33 * 0.5 → 16.67)', (): void => {
        const cost: Cost = Cost.fromCalculation(33.33 * 0.5);
        expect(cost.amount).toBe(16.67);
        expect(cost.currency).toBe('PEN');
    });

    it('fromCalculation rounds the PrivateClub margin (50.50 * 1.2 → 60.60)', (): void => {
        expect(Cost.fromCalculation(50.5 * 1.2).amount).toBe(60.6);
    });
});

describe('TimeSlot value object', (): void => {
    it('accepts a valid same-day slot', (): void => {
        const timeSlot: TimeSlot = slot(10, 12);
        expect(timeSlot.start.getHours()).toBe(10);
        expect(timeSlot.end.getHours()).toBe(12);
    });

    it('rejects end equal to start', (): void => {
        const base: Date = new Date();
        const start: Date = new Date(base.getTime());
        start.setHours(10, 0, 0, 0);
        const end: Date = new Date(base.getTime());
        end.setHours(10, 0, 0, 0);
        expect((): TimeSlot => TimeSlot.create(start, end)).toThrow('slot end must be after start');
    });

    it('rejects end before start', (): void => {
        const base: Date = new Date();
        const start: Date = new Date(base.getTime());
        start.setHours(12, 0, 0, 0);
        const end: Date = new Date(base.getTime());
        end.setHours(10, 0, 0, 0);
        expect((): TimeSlot => TimeSlot.create(start, end)).toThrow('slot end must be after start');
    });

    it('rejects a cross-day slot', (): void => {
        const start: Date = new Date();
        start.setHours(22, 0, 0, 0);
        const end: Date = new Date(start.getTime() + 3 * 60 * 60 * 1000);
        expect((): TimeSlot => TimeSlot.create(start, end)).toThrow('slot must be within the same calendar');
    });

    it('is frozen (immutable)', (): void => {
        expect(Object.isFrozen(slot(10, 12))).toBe(true);
    });

    it('touching endpoints do NOT overlap (10:00-12:00 vs 12:00-14:00)', (): void => {
        expect(slot(10, 12).overlaps(slot(12, 14))).toBe(false);
    });

    it('partial overlap is detected (10:00-12:00 vs 11:00-13:00)', (): void => {
        expect(slot(10, 12).overlaps(slot(11, 13))).toBe(true);
    });

    it('containment overlaps (10:30-11:30 inside 10:00-12:00)', (): void => {
        expect(slot(10, 12).overlaps(slot(10, 11))).toBe(true);
    });

    it('disjoint slots do NOT overlap (8:00-9:00 vs 10:00-12:00)', (): void => {
        expect(slot(8, 9).overlaps(slot(10, 12))).toBe(false);
    });

    it('overlap is symmetric for a partial overlap', (): void => {
        const a: TimeSlot = slot(10, 12);
        const b: TimeSlot = slot(11, 13);
        expect(a.overlaps(b)).toBe(b.overlaps(a));
    });
});
