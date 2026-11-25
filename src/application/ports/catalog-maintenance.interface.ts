// S3 (odd/tasks/demo-completion.md): the catalog horizon is materialised data, so
// it needs a maintenance operation that keeps it rolling. The port exists so the
// composition root can bind the in-memory adapter (whose horizon is computed per
// process and therefore never expires) and the PostgreSQL adapter (whose rows are
// static and must be extended) without the route knowing which one it talks to.
export interface CatalogMaintenance {
    /**
     * Ensures every active space has one availability window for each day from
     * today (America/Lima) through today + 29. Idempotent: running it twice in a
     * row reports 0 the second time.
     *
     * @returns the number of windows created by this call
     */
    refreshHorizon(): Promise<number>;
}

export const CATALOG_HORIZON_DAYS: number = 30;
