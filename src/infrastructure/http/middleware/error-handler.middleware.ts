import type { NextFunction, Request, Response } from "express";
import { EntityNotFoundException } from "../../../domain/exceptions/entity-not-found.exception";
import { InvalidStateTransitionException } from "../../../domain/exceptions/invalid-state-transition.exception";
import { ReservationConflictException } from "../../../domain/exceptions/reservation-conflict.exception";

// Appendix B — the single APIError shape every error response uses.
interface APIError {
    readonly error: {
        readonly code: string;
        readonly message: string;
        readonly details?: unknown;
    };
}

const buildAPIError = (code: string, message: string, details?: unknown): APIError => {
    if (details === undefined) {
        return { error: { code: code, message: message } };
    }
    return { error: { code: code, message: message, details: details } };
};

// Registered LAST (after all routes) — maps every thrown error to the
// APIError shape. Generic Errors are surfaced as client-caused 400s; only
// non-Error throwables (framework faults) fall back to a generic 500 that
// never leaks internals.
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof EntityNotFoundException) {
        res.status(404).json(buildAPIError(err.code, err.message));
        return;
    }
    if (err instanceof ReservationConflictException) {
        res.status(409).json(buildAPIError(err.code, err.message));
        return;
    }
    if (err instanceof InvalidStateTransitionException) {
        res.status(422).json(buildAPIError(err.code, err.message));
        return;
    }
    if (err instanceof Error) {
        res.status(400).json(buildAPIError('BAD_REQUEST', err.message));
        return;
    }
    res.status(500).json(buildAPIError('INTERNAL_ERROR', 'Internal server error'));
};
