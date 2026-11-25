import type { CatalogMaintenance } from "../../../application/ports/catalog-maintenance.interface";

// The in-memory adapter derives its 30-day horizon from the current business day
// on every process start (space.in-memory.repository.ts), so there is nothing to
// extend — the scheduled refresh reports 0.
export class InMemoryCatalogMaintenance implements CatalogMaintenance {
    public async refreshHorizon(): Promise<number> {
        return 0;
    }
}
