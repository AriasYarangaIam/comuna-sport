import { createHash } from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type {
    IdempotencyClaimResult,
    IdempotencyStore,
} from '../../../application/ports/idempotency-store.interface';
import {
    IDEMPOTENCY_TTL_MS,
    getIdempotencyStore,
    inMemoryIdempotencyStore,
} from '../../persistence/in-memory/idempotency.in-memory.store';

// Design Decision D4 (DEVELOPMENT.md §11). POST /spaces/:id/reservations honours
// a client-supplied `Idempotency-Key`. The guard is store-agnostic: the claim is
// delegated to an `IdempotencyStore` port, which is what makes the claim atomic
// (event-loop Map today, `idempotency_keys` PRIMARY KEY with PostgreSQL).
export { IDEMPOTENCY_TTL_MS, getIdempotencyStore };

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

export const createIdempotencyGuard = (store: IdempotencyStore): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const headerValue: string | string[] | undefined = req.headers['idempotency-key'];
        const key: string | undefined = Array.isArray(headerValue) ? headerValue[0] : headerValue;
        if (key === undefined || key === '') {
            res.status(400).json({
                error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'Idempotency-Key header is required.' }
            });
            return;
        }

        const requestHash: string = hashPayload(req.body);

        let claim: IdempotencyClaimResult;
        try {
            claim = await store.claim(key, requestHash);
        } catch (error: unknown) {
            next(error);
            return;
        }

        if (claim.outcome === 'payload_mismatch') {
            res.status(422).json({
                error: {
                    code: 'IDEMPOTENCY_CONFLICT',
                    message: 'Idempotency key reused with a different payload.',
                    details: { key: key, reason: 'payload_mismatch' }
                }
            });
            return;
        }
        if (claim.outcome === 'in_flight') {
            res.status(409).json({
                error: {
                    code: 'IDEMPOTENCY_CONFLICT',
                    message: 'A request with this idempotency key is already in progress.',
                    details: { key: key, reason: 'in_flight' }
                }
            });
            return;
        }
        if (claim.outcome === 'replay') {
            res.status(claim.status).json(claim.body); // replay
            return;
        }

        // Intercept res.send to cache the completed response (2xx only). Non-2xx
        // responses deliberately leave the claim in_flight (D4 contract): the
        // record expires through the TTL instead of caching a failure.
        const originalSend: (body: unknown) => Response = res.send.bind(res);
        res.send = (body: unknown): Response => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return originalSend(body);
            }
            const status: number = res.statusCode;
            const capturedBody: unknown = captureResponseBody(body);
            void (async (): Promise<void> => {
                try {
                    await store.complete(key, status, capturedBody);
                    originalSend(body);
                } catch (error: unknown) {
                    next(error);
                }
            })();
            return res;
        };

        next();
    };
};

export const idempotencyGuard: RequestHandler = createIdempotencyGuard(inMemoryIdempotencyStore);
