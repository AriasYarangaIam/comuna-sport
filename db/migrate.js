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

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const CREATE_MIGRATIONS_TABLE = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
`;

async function run() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('DATABASE_URL is not set. Copy .env.example to .env before running pnpm db:migrate.');
        process.exit(1);
    }

    const pool = new Pool({ connectionString });
    let client = null;

    try {
        client = await pool.connect();
        await client.query(CREATE_MIGRATIONS_TABLE);

        const appliedRows = await client.query('SELECT filename FROM schema_migrations');
        const applied = new Set(appliedRows.rows.map((row) => row.filename));

        const files = fs
            .readdirSync(MIGRATIONS_DIR)
            .filter((filename) => filename.endsWith('.sql'))
            .sort();

        let appliedCount = 0;

        for (const filename of files) {
            if (applied.has(filename)) {
                continue;
            }

            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');

            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
                await client.query('COMMIT');
            } catch (error) {
                await client.query('ROLLBACK');
                throw new Error(`migration ${filename} failed: ${error.message}`);
            }

            appliedCount += 1;
            console.log(`applied ${filename}`);
        }

        console.log(
            `migrations complete: ${appliedCount} applied, ${files.length - appliedCount} already applied, ${files.length} total`
        );
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
