// Application port for the D4 idempotency store (DEVELOPMENT.md §11).
//
// The claim MUST be atomic: two concurrent retries carrying the same
// Idempotency-Key can never both observe "absent" and both execute the handler.
// The in-memory adapter guarantees it on the Node event loop (no `await` between
// the read and the write); the PostgreSQL adapter guarantees it with a single
// INSERT against the `idempotency_keys` PRIMARY KEY (DATABASE.md §5 and §7), so
// the unique constraint itself picks the winner.
export type IdempotencyClaimResult =
    | { readonly outcome: 'claimed' }
    | { readonly outcome: 'in_flight' }
    | { readonly outcome: 'payload_mismatch' }
    | { readonly outcome: 'replay'; readonly status: number; readonly body: unknown };

export interface IdempotencyStore {
    claim(key: string, requestHash: string): Promise<IdempotencyClaimResult>;
    complete(key: string, status: number, body: unknown): Promise<void>;
}
