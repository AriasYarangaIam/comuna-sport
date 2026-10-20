import type { IdempotencyClaimResult, IdempotencyStore } from '../../../application/ports/idempotency-store.interface';

// D4 TTL (DEVELOPMENT.md §11): a claim older than 24 h is treated as absent and
// may be overwritten. `complete()` resets `createdAt`, so the window restarts
// when the response is stored (parity with the pre-extraction middleware).
export const IDEMPOTENCY_TTL_MS: number = 24 * 60 * 60 * 1000;

export interface IdempotencyRecord {
    state: 'in_flight' | 'completed';
    requestHash: string;
    response?: { status: number; body: unknown };
    createdAt: number;
}

const store: Map<string, IdempotencyRecord> = new Map<string, IdempotencyRecord>();

// Exported so integration tests (T20) can isolate/clear state between cases.
export const getIdempotencyStore = (): ReadonlyMap<string, Readonly<IdempotencyRecord>> => store;

// In-memory adapter of the D4 port. The Map is process-local and loses its
// state on restart; the PostgreSQL adapter is the durable replacement.
export class InMemoryIdempotencyStore implements IdempotencyStore {
    // ATOMIC by construction: every read/write below is synchronous — there is
    // NO `await` between the Map.get and the Map.set, so two concurrent retries
    // cannot both pass the "not found" check on Node's single-threaded loop.
    public claim(key: string, requestHash: string): Promise<IdempotencyClaimResult> {
        const existing: IdempotencyRecord | undefined = store.get(key);

        // Stale records past the TTL are treated as absent (and may be overwritten).
        if (existing !== undefined && Date.now() - existing.createdAt < IDEMPOTENCY_TTL_MS) {
            if (existing.requestHash !== requestHash) {
                return Promise.resolve({ outcome: 'payload_mismatch' });
            }
            if (existing.state === 'in_flight') {
                return Promise.resolve({ outcome: 'in_flight' });
            }
            if (existing.response !== undefined) {
                return Promise.resolve({
                    outcome: 'replay',
                    status: existing.response.status,
                    body: existing.response.body,
                });
            }
        }

        // Atomic claim — synchronous, no await between get and set.
        store.set(key, { state: 'in_flight', requestHash: requestHash, createdAt: Date.now() });
        return Promise.resolve({ outcome: 'claimed' });
    }

    public complete(key: string, status: number, body: unknown): Promise<void> {
        const existing: IdempotencyRecord | undefined = store.get(key);
        store.set(key, {
            state: 'completed',
            requestHash: existing === undefined ? '' : existing.requestHash,
            response: { status: status, body: body },
            // Fresh timestamp: completion restarts the TTL window.
            createdAt: Date.now(),
        });
        return Promise.resolve();
    }
}

export const inMemoryIdempotencyStore: InMemoryIdempotencyStore = new InMemoryIdempotencyStore();
