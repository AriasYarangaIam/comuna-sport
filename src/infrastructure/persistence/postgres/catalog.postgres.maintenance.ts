import type { Pool } from 'pg';

import type { CatalogMaintenance } from '../../../application/ports/catalog-maintenance.interface';

// S3 (odd/tasks/demo-completion.md): keeps `space_availability_windows` rolling.
//
// The wall-clock hours of each space are derived from its own latest window, so
// this statement stays correct if a space's hours ever change and needs no
// duplicated per-space table. The surrogate id uses the same deterministic
// formula as `db/migrations/002_seed_spaces.sql` (md5(space_id || day)), so a day
// that already has a window conflicts on the primary key and is left untouched —
// that is what makes the operation idempotent and non-destructive.
const REFRESH_SQL: string = `
WITH latest_hours AS (
    SELECT DISTINCT ON (space_id)
        space_id,
        (window_start AT TIME ZONE 'America/Lima')::time AS start_time,
        (window_end   AT TIME ZONE 'America/Lima')::time AS end_time
    FROM space_availability_windows
    ORDER BY space_id, window_start DESC
),
inserted AS (
    INSERT INTO space_availability_windows (id, space_id, window_start, window_end)
    SELECT
        md5(h.space_id::text || day::text)::uuid,
        h.space_id,
        (day::date + h.start_time) AT TIME ZONE 'America/Lima',
        (day::date + h.end_time)   AT TIME ZONE 'America/Lima'
    FROM latest_hours h
    JOIN spaces s ON s.id = h.space_id AND s.is_active
    CROSS JOIN generate_series(
        (now() AT TIME ZONE 'America/Lima')::date,
        (now() AT TIME ZONE 'America/Lima')::date + 29,
        interval '1 day'
    ) AS days (day)
    ON CONFLICT (id) DO NOTHING
    RETURNING 1
)
SELECT count(*)::int AS extended FROM inserted
`;

export class PostgresCatalogMaintenance implements CatalogMaintenance {
    public constructor(private readonly pool: Pool) {}

    public async refreshHorizon(): Promise<number> {
        const result = await this.pool.query<{ extended: number }>(REFRESH_SQL);
        const row = result.rows[0];
        return row === undefined ? 0 : row.extended;
    }
}
