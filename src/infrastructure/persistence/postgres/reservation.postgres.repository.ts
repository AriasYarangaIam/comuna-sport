import type { Pool, QueryResult } from 'pg';

import { Reservation } from '../../../domain/entities/reservation.entity';
import { ReservationConflictException } from '../../../domain/exceptions/reservation-conflict.exception';
import type { ReservationReader, ReservationWriter } from '../../../domain/repositories/reservation.repository';
import { ReservationId } from '../../../domain/value-objects/reservation-id.vo';
import { SpaceId } from '../../../domain/value-objects/space-id.vo';
import { TimeSlot } from '../../../domain/value-objects/time-slot.vo';
import { toReservation } from './rows';
import type { ReservationRow } from './rows';

// Bounds are projected explicitly — the adapter never hands a raw `tstzrange`
// string to the domain (lower/upper keep the half-open '[)' semantics).
const SELECT_COLUMNS: string =
    'SELECT id, space_id, user_id, lower(time_slot) AS slot_start, upper(time_slot) AS slot_end, ' +
    'amount, currency, role, created_at, is_active FROM reservations';

const EXCLUSION_VIOLATION: string = '23P01';

const isExclusionViolation = (error: unknown): boolean => {
    if (error instanceof Error) {
        return (error as Error & { code?: string }).code === EXCLUSION_VIOLATION;
    }
    return false;
};

export class PostgresReservationRepository implements ReservationReader, ReservationWriter {
    public constructor(private readonly pool: Pool) {}

    public async findById(id: ReservationId): Promise<Reservation | null> {
        const result: QueryResult<ReservationRow> = await this.pool.query<ReservationRow>(
            `${SELECT_COLUMNS} WHERE id = $1`,
            [id.value]
        );
        const row: ReservationRow | undefined = result.rows[0];
        return row === undefined ? null : toReservation(row);
    }

    // Optimistic-lock replacement (INV App.A R3): the EXCLUDE constraint is the
    // authority, but the read port still answers "is this slot taken?".
    public async findBySpaceAndSlot(spaceId: SpaceId, slot: TimeSlot): Promise<Reservation | null> {
        const result: QueryResult<ReservationRow> = await this.pool.query<ReservationRow>(
            `${SELECT_COLUMNS} WHERE space_id = $1 AND is_active ` +
            "AND time_slot && tstzrange($2::timestamptz, $3::timestamptz, '[)') LIMIT 1",
            [spaceId.value, slot.start, slot.end]
        );
        const row: ReservationRow | undefined = result.rows[0];
        return row === undefined ? null : toReservation(row);
    }

    public async findByUserId(userId: string): Promise<Reservation[]> {
        const result: QueryResult<ReservationRow> = await this.pool.query<ReservationRow>(
            `${SELECT_COLUMNS} WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        return result.rows.map((row: ReservationRow): Reservation => toReservation(row));
    }

    public async save(reservation: Reservation): Promise<void> {
        try {
            await this.pool.query(
                'INSERT INTO reservations ' +
                '(id, space_id, user_id, time_slot, amount, currency, role, created_at, is_active) ' +
                "VALUES ($1, $2, $3, tstzrange($4::timestamptz, $5::timestamptz, '[)'), $6, $7, $8, $9, $10) " +
                'ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active',
                [
                    reservation.id.value,
                    reservation.spaceId.value,
                    reservation.userId,
                    reservation.timeSlot.start,
                    reservation.timeSlot.end,
                    reservation.cost.amount.toFixed(2),
                    reservation.cost.currency,
                    reservation.role.value,
                    reservation.createdAt,
                    reservation.isActive,
                ]
            );
        } catch (error: unknown) {
            // The GiST EXCLUDE constraint (reservations_no_overlap) raises
            // exclusion_violation when an active reservation already covers the
            // slot. Surface it as the domain conflict so HTTP maps it to 409.
            if (isExclusionViolation(error)) {
                throw new ReservationConflictException(
                    `time slot already reserved for space: ${reservation.spaceId.value}`
                );
            }
            throw error;
        }
    }
}
