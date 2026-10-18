import { createHash } from "crypto";
import type { NextFunction, Request, Response } from "express";

// Design Decision D4 (DEVELOPMENT.md §11). POST /spaces/:id/reservations honours
// a client-supplied `Idempotency-Key`. The claim is ATOMIC: a synchronous
// Map.get then Map.set with NO await between them — Node's single-threaded
// event loop makes two concurrent retries unable to both pass the "not found"
// check.
//
// NOTE (reviewer, §11 persistence trigger): the in-memory Map loses cache on
// process restart, so a duplicate sent after restart but within the client
// retry window would be processed as new. BEFORE PRODUCTION RUNTIME — and
// before adding any dead-letter queue — replace this Map with a persistent
// store (Redis or a DB unique constraint on the key).

interface IdempotencyRecord {
    state: 'in_flight' | 'completed';
    requestHash: string;
    response?: { status: number; body: unknown };
    createdAt: number;
}

export const IDEMPOTENCY_TTL_MS: number = 24 * 60 * 60 * 1000;

// Exported so integration tests (T20) can isolate/clear state between cases.
const store: Map<string, IdempotencyRecord> = new Map<string, IdempotencyRecord>();
export const getIdempotencyStore = (): ReadonlyMap<string, Readonly<IdempotencyRecord>> => store;

export const hashPayload = (body: unknown): string => {
    return createHash('sha256').update(JSON.stringify(body)).digest('hex');
};

// Express `res.json` serializes first and then calls `this.send(...)` with the
// JSON string, so the intercepted body arrives as a string. Parse it back so
// the stored body is the original DTO; otherwise a `json()` replay would
// double-encode it.
const captureResponseBody = (body: unknown): unknown => {
    if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch {
            return body;
        }
    }
    return body;
};

export const idempotencyGuard = (req: Request, res: Response, next: NextFunction): void => {
    const headerValue: string | string[] | undefined = req.headers['idempotency-key'];
    const key: string | undefined = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (key === undefined || key === '') {
        res.status(400).json({
            error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'Idempotency-Key header is required.' }
        });
        return;
    }

    const requestHash: string = hashPayload(req.body);
    const existing: IdempotencyRecord | undefined = store.get(key);

    // Stale records past the TTL are treated as absent (and may be overwritten).
    if (existing !== undefined && Date.now() - existing.createdAt < IDEMPOTENCY_TTL_MS) {
        if (existing.requestHash !== requestHash) {
            res.status(422).json({
                error: {
                    code: 'IDEMPOTENCY_CONFLICT',
                    message: 'Idempotency key reused with a different payload.',
                    details: { key: key, reason: 'payload_mismatch' }
                }
            });
            return;
        }
        if (existing.state === 'in_flight') {
            res.status(409).json({
                error: {
                    code: 'IDEMPOTENCY_CONFLICT',
                    message: 'A request with this idempotency key is already in progress.',
                    details: { key: key, reason: 'in_flight' }
                }
            });
            return;
        }
        if (existing.state === 'completed' && existing.response !== undefined) {
            res.status(existing.response.status).json(existing.response.body); // replay
            return;
        }
    }

    // Atomic claim — synchronous, no await between get and set.
    store.set(key, { state: 'in_flight', requestHash: requestHash, createdAt: Date.now() });

    // Intercept res.send to cache the completed response (2xx only).
    const originalSend: (body: unknown) => Response = res.send.bind(res);
    res.send = (body: unknown): Response => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            store.set(key, {
                state: 'completed',
                requestHash: requestHash,
                response: { status: res.statusCode, body: captureResponseBody(body) },
                createdAt: Date.now()
            });
        }
        return originalSend(body);
    };

    next();
};
