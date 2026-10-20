import { randomUUID } from 'crypto';
import type { Pool, PoolClient, QueryResult } from 'pg';

import { Space } from '../../../domain/entities/space.entity';
import type { SpaceReader, SpaceWriter } from '../../../domain/repositories/space.repository';
import { SpaceId } from '../../../domain/value-objects/space-id.vo';
import { TimeSlot } from '../../../domain/value-objects/time-slot.vo';
import { toSpace } from './rows';
import type { SpaceRow, WindowRow } from './rows';

interface SpaceWindowRow extends WindowRow {
    readonly space_id: string;
}

const FIND_WINDOWS_SQL: string =
    'SELECT window_start, window_end FROM space_availability_windows WHERE space_id = $1 ORDER BY window_start';

const FIND_ALL_WINDOWS_SQL: string =
    'SELECT space_id, window_start, window_end FROM space_availability_windows ' +
    'WHERE space_id = ANY($1::uuid[]) ORDER BY space_id, window_start';

export class PostgresSpaceRepository implements SpaceReader, SpaceWriter {
    public constructor(private readonly pool: Pool) {}

    public async findById(id: SpaceId): Promise<Space | null> {
        const spaces: QueryResult<SpaceRow> = await this.pool.query<SpaceRow>(
            'SELECT * FROM spaces WHERE id = $1',
            [id.value]
        );
        const row: SpaceRow | undefined = spaces.rows[0];
        if (row === undefined) {
            return null;
        }

        const windows: QueryResult<WindowRow> = await this.pool.query<WindowRow>(FIND_WINDOWS_SQL, [id.value]);
        return toSpace(row, windows.rows);
    }

    public async findAll(): Promise<Space[]> {
        const spaces: QueryResult<SpaceRow> = await this.pool.query<SpaceRow>(
            'SELECT * FROM spaces WHERE is_active ORDER BY name'
        );
        return this.mapSpaces(spaces.rows);
    }

    // DATABASE.md §7: window_start <= :slot_start AND :slot_end <= window_end
    // over active spaces only. DISTINCT collapses the per-day window rows.
    public async findByAvailability(timeSlot: TimeSlot): Promise<Space[]> {
        const spaces: QueryResult<SpaceRow> = await this.pool.query<SpaceRow>(
            'SELECT DISTINCT s.* FROM spaces s ' +
            'JOIN space_availability_windows w ON w.space_id = s.id ' +
            'WHERE s.is_active AND w.window_start <= $1::timestamptz AND $2::timestamptz <= w.window_end ' +
            'ORDER BY s.name',
            [timeSlot.start, timeSlot.end]
        );
        return this.mapSpaces(spaces.rows);
    }

    // The aggregate is written in ONE transaction: space row upsert plus the
    // replacement of its availability windows. Windows are value objects of the
    // Space aggregate (they have no identity beyond the surrogate key), so
    // delete-then-insert is the replacement strategy; DATABASE.md's no-hard-DELETE
    // rule targets aggregate rows (soft-delete via `is_active`), not owned VOs.
    public async save(space: Space): Promise<void> {
        const client: PoolClient = await this.pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                'INSERT INTO spaces (id, name, type, capacity, base_price, currency, is_active) ' +
                'VALUES ($1, $2, $3, $4, $5, $6, $7) ' +
                'ON CONFLICT (id) DO UPDATE SET ' +
                'name = EXCLUDED.name, type = EXCLUDED.type, capacity = EXCLUDED.capacity, ' +
                'base_price = EXCLUDED.base_price, currency = EXCLUDED.currency, is_active = EXCLUDED.is_active',
                [
                    space.id.value,
                    space.name,
                    space.type,
                    space.capacity,
                    space.basePrice.amount.toFixed(2),
                    space.basePrice.currency,
                    space.isActive,
                ]
            );

            await client.query('DELETE FROM space_availability_windows WHERE space_id = $1', [space.id.value]);

            for (const window of space.availabilityWindows) {
                await client.query(
                    'INSERT INTO space_availability_windows (id, space_id, window_start, window_end) ' +
                    'VALUES ($1, $2, $3, $4)',
                    [randomUUID(), space.id.value, window.start, window.end]
                );
            }

            await client.query('COMMIT');
        } catch (error: unknown) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    private async mapSpaces(rows: readonly SpaceRow[]): Promise<Space[]> {
        if (rows.length === 0) {
            return [];
        }

        const ids: string[] = rows.map((row: SpaceRow): string => row.id);
        const windows: QueryResult<SpaceWindowRow> = await this.pool.query<SpaceWindowRow>(
            FIND_ALL_WINDOWS_SQL,
            [ids]
        );

        const windowsBySpace: Map<string, WindowRow[]> = new Map<string, WindowRow[]>();
        for (const window of windows.rows) {
            const group: WindowRow[] | undefined = windowsBySpace.get(window.space_id);
            if (group === undefined) {
                windowsBySpace.set(window.space_id, [window]);
            } else {
                group.push(window);
            }
        }

        return rows.map((row: SpaceRow): Space => toSpace(row, windowsBySpace.get(row.id) ?? []));
    }
}
