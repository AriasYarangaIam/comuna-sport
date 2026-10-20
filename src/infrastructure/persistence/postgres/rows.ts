import { Cost } from '../../../domain/value-objects/cost.vo';
import { Incident } from '../../../domain/entities/incident.entity';
import { IncidentId } from '../../../domain/value-objects/incident-id.vo';
import { IncidentState } from '../../../domain/value-objects/incident-state.vo';
import type { IncidentStateType } from '../../../domain/value-objects/incident-state.vo';
import { Reservation } from '../../../domain/entities/reservation.entity';
import { ReservationId } from '../../../domain/value-objects/reservation-id.vo';
import { Space } from '../../../domain/entities/space.entity';
import type { SpaceType } from '../../../domain/entities/space.entity';
import { SpaceId } from '../../../domain/value-objects/space-id.vo';
import { TimeSlot } from '../../../domain/value-objects/time-slot.vo';
import { UserRole } from '../../../domain/value-objects/user-role.vo';

// Raw row shapes as returned by `pg`. NUMERIC arrives as a string (never a JS
// number) and CHAR(3)/CHAR(64) may arrive space-padded, so mappers convert and
// trim before rebuilding the domain entities (DATABASE.md §3).
export interface SpaceRow {
    readonly id: string;
    readonly name: string;
    readonly type: string;
    readonly capacity: number;
    readonly base_price: string;
    readonly currency: string;
    readonly is_active: boolean;
}

export interface WindowRow {
    readonly window_start: Date;
    readonly window_end: Date;
}

export interface ReservationRow {
    readonly id: string;
    readonly space_id: string;
    readonly user_id: string;
    readonly slot_start: Date;
    readonly slot_end: Date;
    readonly amount: string;
    readonly currency: string;
    readonly role: string;
    readonly created_at: Date;
    readonly is_active: boolean;
}

export interface IncidentRow {
    readonly id: string;
    readonly space_id: string;
    readonly reporter_id: string;
    readonly description: string;
    readonly state: string | null;
    readonly created_at: Date;
    readonly resolved_at: Date | null;
}

export const toSpace = (row: SpaceRow, windows: readonly WindowRow[]): Space => {
    return Space.fromPersistence({
        id: SpaceId.create(row.id),
        name: row.name,
        type: row.type as SpaceType,
        capacity: row.capacity,
        basePrice: Cost.create(Number(row.base_price), row.currency.trim()),
        availabilityWindows: windows.map((window: WindowRow): TimeSlot =>
            TimeSlot.create(window.window_start, window.window_end)),
        isActive: row.is_active,
    });
};

export const toReservation = (row: ReservationRow): Reservation => {
    return Reservation.fromPersistence({
        id: ReservationId.create(row.id),
        spaceId: SpaceId.create(row.space_id),
        userId: row.user_id,
        timeSlot: TimeSlot.create(row.slot_start, row.slot_end),
        cost: Cost.create(Number(row.amount), row.currency.trim()),
        role: UserRole.create(row.role),
        createdAt: row.created_at,
        isActive: row.is_active,
    });
};

export const toIncident = (row: IncidentRow): Incident => {
    if (row.state === null) {
        throw new Error('incident row has no state');
    }
    const state: IncidentStateType = IncidentState.create(row.state).value;

    return Incident.fromPersistence({
        id: IncidentId.create(row.id),
        spaceId: SpaceId.create(row.space_id),
        reporterId: row.reporter_id,
        description: row.description,
        createdAt: row.created_at,
        state: state,
        resolvedAt: row.resolved_at === null ? null : row.resolved_at,
    });
};
