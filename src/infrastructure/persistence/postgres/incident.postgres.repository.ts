import type { Pool, QueryResult } from 'pg';

import { Incident } from '../../../domain/entities/incident.entity';
import type { IncidentReader, IncidentWriter } from '../../../domain/repositories/incident.repository';
import { IncidentId } from '../../../domain/value-objects/incident-id.vo';
import { SpaceId } from '../../../domain/value-objects/space-id.vo';
import { toIncident } from './rows';
import type { IncidentRow } from './rows';

const SELECT_COLUMNS: string =
    'SELECT id, space_id, reporter_id, description, state, created_at, resolved_at FROM incidents';

export class PostgresIncidentRepository implements IncidentReader, IncidentWriter {
    public constructor(private readonly pool: Pool) {}

    public async findById(id: IncidentId): Promise<Incident | null> {
        const result: QueryResult<IncidentRow> = await this.pool.query<IncidentRow>(
            `${SELECT_COLUMNS} WHERE id = $1`,
            [id.value]
        );
        const row: IncidentRow | undefined = result.rows[0];
        return row === undefined ? null : toIncident(row);
    }

    public async findBySpaceId(spaceId: SpaceId): Promise<Incident[]> {
        const result: QueryResult<IncidentRow> = await this.pool.query<IncidentRow>(
            `${SELECT_COLUMNS} WHERE space_id = $1 ORDER BY created_at DESC`,
            [spaceId.value]
        );
        return result.rows.map((row: IncidentRow): Incident => toIncident(row));
    }

    // Full upsert: state transitions are domain-driven UPDATEs of the same row
    // (DATABASE.md §6) — no triggers, no stored procedures.
    public async save(incident: Incident): Promise<void> {
        await this.pool.query(
            'INSERT INTO incidents (id, space_id, reporter_id, description, state, created_at, resolved_at) ' +
            'VALUES ($1, $2, $3, $4, $5, $6, $7) ' +
            'ON CONFLICT (id) DO UPDATE SET ' +
            'space_id = EXCLUDED.space_id, reporter_id = EXCLUDED.reporter_id, ' +
            'description = EXCLUDED.description, state = EXCLUDED.state, ' +
            'created_at = EXCLUDED.created_at, resolved_at = EXCLUDED.resolved_at',
            [
                incident.id.value,
                incident.spaceId.value,
                incident.reporterId,
                incident.description,
                incident.getState(),
                incident.createdAt,
                incident.resolvedAt,
            ]
        );
    }
}
