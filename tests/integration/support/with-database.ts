/// <reference types="node" />
/// <reference types="jest" />

// Shared gate for the database-backed suites.
//
// The URL comes from the environment ONLY — the suites never load `.env`, so the
// default `pnpm test` run stays hermetic (no database required).
export const databaseUrl: string | undefined = process.env['DATABASE_URL'];
export const connectionString: string = databaseUrl === undefined ? '' : databaseUrl.trim();
export const databaseEnabled: boolean = connectionString !== '';

// Enables (or skips) a database-gated suite in one place, with the reason
// logged so a skipped run is never mistaken for a green one.
export const describeWithDatabase = (name: string, suite: () => void): void => {
    if (!databaseEnabled) {
        console.log(
            '[postgres] SKIPPED — DATABASE_URL is not set. ' +
            "Enable it with: $env:DATABASE_URL='postgres://comuna:comuna@localhost:5434/comuna_sport'; pnpm test"
        );
        describe.skip(name, suite);
        return;
    }
    describe(name, suite);
};
