import type { Pool, QueryResult } from 'pg';

import type {
    IdempotencyClaimResult,
    IdempotencyStore,
} from '../../../application/ports/idempotency-store.interface';

interface IdempotencyRow {
    readonly request_hash: string;
    readonly state: string | null;
    readonly response_status: number | null;
    readonly response_body: unknown;
    readonly expired: boolean;
}

// D4 TTL (DATABASE.md §7): records older than 24 h are stale and may be
// reclaimed. 24 h mirrors `IDEMPOTENCY_TTL_MS` in the in-memory adapter and must
// outlive the longest client retry path.
const CLAIM_ATTEMPTS: number = 2;

const INSERT_CLAIM_SQL: string =
    "INSERT INTO idempotency_keys (key, request_hash, state, created_at) " +
    "VALUES ($1, $2, 'in_flight', now()) ON CONFLICT (key) DO NOTHING";

const SELECT_CLAIM_SQL: string =
    'SELECT request_hash, state, response_status, response_body, ' +
    "(created_at < now() - interval '24 hours') AS expired " +
    'FROM idempotency_keys WHERE key = $1';

const DELETE_STALE_SQL: string =
    "DELETE FROM idempotency_keys WHERE key = $1 AND created_at < now() - interval '24 hours'";

export class PostgresIdempotencyStore implements IdempotencyStore {
    public constructor(private readonly pool: Pool) {}

    // D4 claim = a single INSERT; the PRIMARY KEY on `key` picks the winner, so
    // two concurrent requests can never both claim the same Idempotency-Key
    // (DATABASE.md §5, §7). At most two attempts: the second one only runs when
    // the existing record was stale and has just been swept.
    public async claim(key: string, requestHash: string): Promise<IdempotencyClaimResult> {
        for (let attempt: number = 0; attempt < CLAIM_ATTEMPTS; attempt += 1) {
            const inserted: QueryResult<never> = await this.pool.query<never>(INSERT_CLAIM_SQL, [key, requestHash]);
            if (inserted.rowCount === 1) {
                return { outcome: 'claimed' };
            }

            const found: QueryResult<IdempotencyRow> = await this.pool.query<IdempotencyRow>(
                SELECT_CLAIM_SQL,
                [key]
            );
            const row: IdempotencyRow | undefined = found.rows[0];
            if (row === undefined) {
                continue; // deleted between INSERT and SELECT — retry the claim
            }

            if (row.expired) {
                await this.pool.query<never>(DELETE_STALE_SQL, [key]);
                continue; // stale record swept — retry the claim once
            }

            if (row.request_hash.trim() !== requestHash) {
                return { outcome: 'payload_mismatch' };
            }
            if (row.state === 'completed' && row.response_status !== null) {
                return { outcome: 'replay', status: row.response_status, body: row.response_body };
            }
            return { outcome: 'in_flight' };
        }

        // Both attempts lost a race with a concurrent writer: the key is held.
        return { outcome: 'in_flight' };
    }

    public async complete(key: string, status: number, body: unknown): Promise<void> {
        await this.pool.query(
            "UPDATE idempotency_keys SET state = 'completed', response_status = $2, response_body = $3::jsonb " +
            'WHERE key = $1',
            [key, status, JSON.stringify(body)]
        );
    }
}
