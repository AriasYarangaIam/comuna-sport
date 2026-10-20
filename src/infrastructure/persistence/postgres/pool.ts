import { Pool } from 'pg';

// D3 PostgreSQL adapter — one pool per process. The composition root owns the
// instance and hands it to every repository; `max: 10` caps the server-side
// connections for a single-node API deployment.
export const createPool = (databaseUrl: string): Pool => {
    return new Pool({ connectionString: databaseUrl, max: 10 });
};

export const closePool = async (pool: Pool): Promise<void> => {
    await pool.end();
};
