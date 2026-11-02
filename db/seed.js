'use strict';

// Load .env when present. A real environment variable always wins over the file,
// and a missing .env is not an error (CI and one-off shells set DATABASE_URL directly).
try {
    process.loadEnvFile();
} catch {
    // No .env file — DATABASE_URL must come from the process environment.
}

const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const SEED_FILE = path.join(__dirname, 'migrations', '002_seed_spaces.sql');

// Re-applies the seed on every run. The seed is an UPSERT, so running it twice
// is a no-op; running it after the catalog was mutated RESTORES the four
// reference spaces, their prices and their 30-day availability windows.
// `pnpm db:migrate` cannot do this: it tracks applied files in schema_migrations
// and never re-executes 002_seed_spaces.sql.
async function run() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('DATABASE_URL is not set. Copy .env.example to .env before running pnpm db:seed.');
        process.exit(1);
    }

    const pool = new Pool({ connectionString });
    let client = null;

    try {
        client = await pool.connect();
        const sql = fs.readFileSync(SEED_FILE, 'utf8');

        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`seed failed: ${error.message}`);
        }

        const spaces = await client.query('SELECT count(*)::int AS count FROM spaces WHERE is_active');
        console.log(`seed applied: ${spaces.rows[0].count} active spaces`);
    } finally {
        if (client !== null) {
            client.release();
        }
        await pool.end();
    }
}

run().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
