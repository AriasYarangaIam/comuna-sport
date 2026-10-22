/// <reference types="node" />
/// <reference types="jest" />

import { randomUUID } from "crypto";

import type { Pool } from "pg";

import { closePool, createPool } from "../../src/infrastructure/persistence/postgres/pool";
import { connectionString, describeWithDatabase } from "./support/with-database";

// Seeded catalog id (db/migrations/002_seed_spaces.sql).
const SEEDED_CANCHA_ID: string = '11111111-1111-4111-8111-111111111111';

const sqlState = (error: unknown): string | undefined =>
    error instanceof Error ? (error as Error & { code?: string }).code : undefined;

describeWithDatabase('PostgreSQL incidents constraints', (): void => {
    let pool: Pool;

    beforeAll((): void => {
        pool = createPool(connectionString);
    });

    afterAll(async (): Promise<void> => {
        await closePool(pool);
    });

    // A probe marker in both text columns: every row this suite may leave behind
    // (an insert that unexpectedly succeeds) is removed again in afterEach.
    const PROBE_MARKER: string = 'schema-probe';

    const insertIncident = async (
        reporterId: string | null,
        description: string | null,
        state: string | null
    ): Promise<void> => {
        await pool.query(
            'INSERT INTO incidents (id, space_id, reporter_id, description, state, created_at) ' +
            'VALUES ($1, $2, $3, $4, $5, now())',
            [randomUUID(), SEEDED_CANCHA_ID, reporterId, description, state]
        );
    };

    afterEach(async (): Promise<void> => {
        await pool.query('DELETE FROM incidents WHERE reporter_id = $1 OR description = $1', [PROBE_MARKER]);
    });

    it('rejects a NULL state with SQLSTATE 23502', async (): Promise<void> => {
        let caught: unknown;
        try {
            await insertIncident(PROBE_MARKER, PROBE_MARKER, null);
        } catch (error: unknown) {
            caught = error;
        }
        expect(sqlState(caught)).toBe('23502');
    });

    it('rejects a NULL reporter_id with SQLSTATE 23502', async (): Promise<void> => {
        let caught: unknown;
        try {
            await insertIncident(null, PROBE_MARKER, 'UNDER_REVIEW');
        } catch (error: unknown) {
            caught = error;
        }
        expect(sqlState(caught)).toBe('23502');
    });

    it('rejects a NULL description with SQLSTATE 23502', async (): Promise<void> => {
        let caught: unknown;
        try {
            await insertIncident(PROBE_MARKER, null, 'UNDER_REVIEW');
        } catch (error: unknown) {
            caught = error;
        }
        expect(sqlState(caught)).toBe('23502');
    });

    it('declares reporter_id, description and state NOT NULL in the live schema', async (): Promise<void> => {
        const result = await pool.query(
            'SELECT column_name, is_nullable FROM information_schema.columns ' +
            "WHERE table_name = 'incidents' AND column_name IN ('reporter_id', 'description', 'state') " +
            'ORDER BY column_name'
        );
        expect(result.rows).toHaveLength(3);
        for (const row of result.rows as { readonly column_name: string; readonly is_nullable: string }[]) {
            expect(row.is_nullable).toBe('NO');
        }
    });
});
