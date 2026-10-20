'use strict';

// Load .env when present. A real environment variable always wins over the file,
// and a missing .env is not an error.
try {
    process.loadEnvFile();
} catch {
    // No .env file — DATABASE_URL must come from the process environment.
}

const { Pool } = require('pg');

const SWEEP_SQL = `
    DELETE FROM idempotency_keys
    WHERE created_at < now() - interval '24 hours'
`;

async function run() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('DATABASE_URL is not set. Copy .env.example to .env before running pnpm db:sweep.');
        process.exit(1);
    }

    const pool = new Pool({ connectionString });

    try {
        const result = await pool.query(SWEEP_SQL);
        console.log(`swept ${result.rowCount} expired idempotency keys`);
    } finally {
        await pool.end();
    }
}

run().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
